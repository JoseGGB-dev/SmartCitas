package com.smartcitas.appointment;

import com.smartcitas.audit.AuditService;
import com.smartcitas.common.BusinessRuleException;
import com.smartcitas.common.ResourceNotFoundException;
import com.smartcitas.common.StateTransitionService;
import com.smartcitas.notification.NotificationProvider;
import com.smartcitas.patient.Patient;
import com.smartcitas.priority.PriorityCalculationService;
import com.smartcitas.security.CurrentUserService;
import com.smartcitas.slot.MedicalSlot;
import com.smartcitas.slot.MedicalSlotRepository;
import com.smartcitas.slot.MedicalSlotStatus;
import com.smartcitas.user.User;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SlotOfferService {

  private final MedicalSlotRepository slots;
  private final WaitingListEntryRepository waitingList;
  private final SlotOfferRepository offers;
  private final AppointmentRepository appointments;
  private final PriorityCalculationService priorities;
  private final NotificationProvider notifications;
  private final CurrentUserService currentUser;
  private final AuditService audit;
  private final StateTransitionService transitions;

  public SlotOfferService(
      MedicalSlotRepository slots,
      WaitingListEntryRepository waitingList,
      SlotOfferRepository offers,
      AppointmentRepository appointments,
      PriorityCalculationService priorities,
      NotificationProvider notifications,
      CurrentUserService currentUser,
      AuditService audit,
      StateTransitionService transitions) {
    this.slots = slots;
    this.waitingList = waitingList;
    this.offers = offers;
    this.appointments = appointments;
    this.priorities = priorities;
    this.notifications = notifications;
    this.currentUser = currentUser;
    this.audit = audit;
    this.transitions = transitions;
  }

  public Page<SlotOffer> listMine(Pageable pageable) {
    return offers.findByPatientUserIdOrderByCreatedAtDesc(currentUser.requireCurrentUser().getId(), pageable);
  }

  @Transactional
  public Optional<SlotOffer> assignNext(UUID medicalSlotId) {
    MedicalSlot slot =
        slots.findByIdForUpdate(medicalSlotId).orElseThrow(() -> new ResourceNotFoundException("Cupo no encontrado"));
    if (slot.getAvailableCapacity() <= 0) {
      transitions.assertTransition(slot.getStatus(), MedicalSlotStatus.FULL);
      slot.setStatus(MedicalSlotStatus.FULL);
      throw new BusinessRuleException("SLOT_FULL", "El cupo no tiene capacidad disponible");
    }
    if (offers.existsByMedicalSlotIdAndStatus(slot.getId(), SlotOfferStatus.PENDING)) {
      throw new BusinessRuleException("PENDING_OFFER_EXISTS", "Ya existe una oferta pendiente para este cupo");
    }

    List<RankedEntry> ranked =
        waitingList
            .findEligibleForUpdate(slot.getSpecialty().getId(), WaitingListStatus.ACTIVE)
            .stream()
            .map(entry -> new RankedEntry(entry, priorities.calculateAndStore(entry)))
            .sorted(ENTRY_ORDER)
            .toList();

    if (ranked.isEmpty()) {
      audit.record(currentUser.requireCurrentUser(), "ASSIGNMENT_WITHOUT_CANDIDATE", "medical_slots", slot.getId().toString(), null, "{\"specialty\":\"" + slot.getSpecialty().getCode() + "\"}");
      return Optional.empty();
    }

    WaitingListEntry selected = ranked.getFirst().entry();
    transitions.assertTransition(selected.getStatus(), WaitingListStatus.TEMPORARILY_OFFERED);
    selected.setStatus(WaitingListStatus.TEMPORARILY_OFFERED);
    transitions.assertTransition(selected.getAppointmentRequest().getStatus(), AppointmentRequestStatus.OFFERED);
    selected.getAppointmentRequest().setStatus(AppointmentRequestStatus.OFFERED);
    transitions.assertTransition(slot.getStatus(), MedicalSlotStatus.RESERVED);
    slot.setStatus(MedicalSlotStatus.RESERVED);

    SlotOffer offer = new SlotOffer();
    offer.setMedicalSlot(slot);
    offer.setWaitingListEntry(selected);
    offer.setPatient(selected.getPatient());
    offer.setStatus(SlotOfferStatus.PENDING);
    offer.setOfferedAt(OffsetDateTime.now());
    offer.setExpiresAt(OffsetDateTime.now().plusMinutes(30));
    offer.setUniqueToken(UUID.randomUUID().toString());
    offer.setCreatedAt(OffsetDateTime.now());
    offers.save(offer);
    notifications.sendOffer(offer);
    audit.record(currentUser.requireCurrentUser(), "SLOT_OFFER_CREATED", "slot_offers", offer.getId().toString(), null, "{\"status\":\"PENDING\"}");
    return Optional.of(offer);
  }

  @Transactional
  public Appointment accept(UUID offerId, String idempotencyKey) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new BusinessRuleException("IDEMPOTENCY_KEY_REQUIRED", "El encabezado Idempotency-Key es obligatorio");
    }
    User user = currentUser.requireCurrentUser();
    SlotOffer offer =
        offers.findByIdForUpdate(offerId).orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada"));
    Patient patient = offer.getPatient();
    if (!patient.getUser().getId().equals(user.getId())) {
      throw new ResourceNotFoundException("Oferta no encontrada");
    }
    Optional<Appointment> previous = appointments.findByPatientIdAndIdempotencyKey(patient.getId(), idempotencyKey);
    if (previous.isPresent()) {
      return previous.get();
    }
    if (offer.getStatus() != SlotOfferStatus.PENDING) {
      throw new BusinessRuleException("OFFER_NOT_PENDING", "La oferta ya fue respondida");
    }
    expireIfNeeded(offer);
    MedicalSlot slot =
        slots.findByIdForUpdate(offer.getMedicalSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Cupo no encontrado"));
    if (slot.getAvailableCapacity() <= 0) {
      throw new BusinessRuleException("SLOT_FULL", "El cupo ya no tiene capacidad disponible");
    }

    slot.setAvailableCapacity(slot.getAvailableCapacity() - 1);
    slot.setStatus(slot.getAvailableCapacity() == 0 ? MedicalSlotStatus.FULL : MedicalSlotStatus.AVAILABLE);

    transitions.assertTransition(offer.getStatus(), SlotOfferStatus.ACCEPTED);
    offer.setStatus(SlotOfferStatus.ACCEPTED);
    offer.setRespondedAt(OffsetDateTime.now());
    transitions.assertTransition(offer.getWaitingListEntry().getStatus(), WaitingListStatus.ASSIGNED);
    offer.getWaitingListEntry().setStatus(WaitingListStatus.ASSIGNED);
    transitions.assertTransition(offer.getWaitingListEntry().getAppointmentRequest().getStatus(), AppointmentRequestStatus.SCHEDULED);
    offer.getWaitingListEntry().getAppointmentRequest().setStatus(AppointmentRequestStatus.SCHEDULED);

    Appointment appointment = new Appointment();
    appointment.setPatient(patient);
    appointment.setMedicalSlot(slot);
    appointment.setAppointmentRequest(offer.getWaitingListEntry().getAppointmentRequest());
    appointment.setStatus(AppointmentStatus.CONFIRMED);
    appointment.setConfirmationDate(OffsetDateTime.now());
    appointment.setIdempotencyKey(idempotencyKey);
    appointments.save(appointment);
    audit.record(user, "OFFER_ACCEPTED", "slot_offers", offer.getId().toString(), null, "{\"status\":\"ACCEPTED\"}");
    audit.record(user, "APPOINTMENT_CREATED", "appointments", appointment.getId().toString(), null, "{\"status\":\"CONFIRMED\"}");
    return appointment;
  }

  @Transactional
  public Optional<SlotOffer> reject(UUID offerId) {
    User user = currentUser.requireCurrentUser();
    SlotOffer offer =
        offers.findByIdForUpdate(offerId).orElseThrow(() -> new ResourceNotFoundException("Oferta no encontrada"));
    if (!offer.getPatient().getUser().getId().equals(user.getId())) {
      throw new ResourceNotFoundException("Oferta no encontrada");
    }
    if (offer.getStatus() != SlotOfferStatus.PENDING) {
      throw new BusinessRuleException("OFFER_NOT_PENDING", "La oferta ya fue respondida");
    }
    transitions.assertTransition(offer.getStatus(), SlotOfferStatus.REJECTED);
    offer.setStatus(SlotOfferStatus.REJECTED);
    offer.setRespondedAt(OffsetDateTime.now());
    transitions.assertTransition(offer.getWaitingListEntry().getStatus(), WaitingListStatus.REJECTED);
    offer.getWaitingListEntry().setStatus(WaitingListStatus.REJECTED);
    transitions.assertTransition(offer.getWaitingListEntry().getAppointmentRequest().getStatus(), AppointmentRequestStatus.WAITING);
    offer.getWaitingListEntry().getAppointmentRequest().setStatus(AppointmentRequestStatus.WAITING);

    MedicalSlot slot =
        slots.findByIdForUpdate(offer.getMedicalSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Cupo no encontrado"));
    slot.setStatus(MedicalSlotStatus.AVAILABLE);
    audit.record(user, "OFFER_REJECTED", "slot_offers", offer.getId().toString(), null, "{\"status\":\"REJECTED\"}");
    return assignNext(slot.getId());
  }

  private void expireIfNeeded(SlotOffer offer) {
    if (offer.getExpiresAt().isBefore(OffsetDateTime.now())) {
      transitions.assertTransition(offer.getStatus(), SlotOfferStatus.EXPIRED);
      offer.setStatus(SlotOfferStatus.EXPIRED);
      offer.setRespondedAt(OffsetDateTime.now());
      transitions.assertTransition(offer.getWaitingListEntry().getStatus(), WaitingListStatus.EXPIRED);
      offer.getWaitingListEntry().setStatus(WaitingListStatus.EXPIRED);
      throw new BusinessRuleException("OFFER_EXPIRED", "La oferta vencio");
    }
  }

  private record RankedEntry(WaitingListEntry entry, com.smartcitas.appointment.PriorityEvaluation evaluation) {}

  private static final Comparator<RankedEntry> ENTRY_ORDER =
      Comparator.<RankedEntry, BigDecimal>comparing(entry -> entry.evaluation().getTotalScore())
          .reversed()
          .thenComparing(
              entry -> ChronoUnit.DAYS.between(entry.entry().getWaitingSince(), OffsetDateTime.now()),
              Comparator.reverseOrder())
          .thenComparing(entry -> entry.entry().getWaitingSince())
          .thenComparing(entry -> entry.entry().getId());
}
