package com.smartcitas.slot;

import com.smartcitas.audit.AuditService;
import com.smartcitas.common.BusinessRuleException;
import com.smartcitas.common.ResourceNotFoundException;
import com.smartcitas.common.StateTransitionService;
import com.smartcitas.common.dto.ApiDtos.MedicalSlotCreateRequest;
import com.smartcitas.common.dto.ApiDtos.MedicalSlotUpdateRequest;
import com.smartcitas.doctor.Doctor;
import com.smartcitas.doctor.DoctorRepository;
import com.smartcitas.facility.Facility;
import com.smartcitas.facility.FacilityRepository;
import com.smartcitas.security.CurrentUserService;
import com.smartcitas.specialty.Specialty;
import com.smartcitas.specialty.SpecialtyRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MedicalSlotService {

  private final MedicalSlotRepository slots;
  private final DoctorRepository doctors;
  private final FacilityRepository facilities;
  private final SpecialtyRepository specialties;
  private final CurrentUserService currentUser;
  private final AuditService audit;
  private final StateTransitionService transitions;

  public MedicalSlotService(
      MedicalSlotRepository slots,
      DoctorRepository doctors,
      FacilityRepository facilities,
      SpecialtyRepository specialties,
      CurrentUserService currentUser,
      AuditService audit,
      StateTransitionService transitions) {
    this.slots = slots;
    this.doctors = doctors;
    this.facilities = facilities;
    this.specialties = specialties;
    this.currentUser = currentUser;
    this.audit = audit;
    this.transitions = transitions;
  }

  public Page<MedicalSlot> search(
      MedicalSlotStatus status,
      Long specialtyId,
      Long facilityId,
      OffsetDateTime from,
      OffsetDateTime to,
      Pageable pageable) {
    return slots.search(status, specialtyId, facilityId, from, to, pageable);
  }

  @Transactional
  public MedicalSlot create(MedicalSlotCreateRequest body) {
    if (!body.endDatetime().isAfter(body.startDatetime())) {
      throw new BusinessRuleException("INVALID_SLOT_DATES", "La fecha de fin debe ser posterior al inicio");
    }
    Facility facility =
        facilities.findById(body.facilityId()).orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));
    Specialty specialty =
        specialties
            .findById(body.specialtyId())
            .orElseThrow(() -> new ResourceNotFoundException("Especialidad no encontrada"));
    Doctor doctor =
        body.doctorId() == null
            ? null
            : doctors.findById(body.doctorId()).orElseThrow(() -> new ResourceNotFoundException("Medico no encontrado"));

    MedicalSlot slot = new MedicalSlot();
    slot.setDoctor(doctor);
    slot.setFacility(facility);
    slot.setSpecialty(specialty);
    slot.setStartDatetime(body.startDatetime());
    slot.setEndDatetime(body.endDatetime());
    slot.setStatus(MedicalSlotStatus.AVAILABLE);
    slot.setCapacity(body.capacity());
    slot.setAvailableCapacity(body.capacity());
    slots.save(slot);
    audit.record(currentUser.requireCurrentUser(), "MEDICAL_SLOT_CREATED", "medical_slots", slot.getId().toString(), null, "{\"status\":\"AVAILABLE\"}");
    return slot;
  }

  @Transactional
  public MedicalSlot update(UUID id, MedicalSlotUpdateRequest body) {
    MedicalSlot slot =
        slots.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Cupo no encontrado"));
    if (body.status() != null) {
      transitions.assertTransition(slot.getStatus(), body.status());
      slot.setStatus(body.status());
    }
    if (body.availableCapacity() != null) {
      if (body.availableCapacity() > slot.getCapacity()) {
        throw new BusinessRuleException("INVALID_CAPACITY", "La capacidad disponible no puede superar la capacidad total");
      }
      slot.setAvailableCapacity(body.availableCapacity());
    }
    if (body.startDatetime() != null) {
      slot.setStartDatetime(body.startDatetime());
    }
    if (body.endDatetime() != null) {
      slot.setEndDatetime(body.endDatetime());
    }
    audit.record(currentUser.requireCurrentUser(), "MEDICAL_SLOT_UPDATED", "medical_slots", slot.getId().toString(), null, "{\"status\":\"" + slot.getStatus() + "\"}");
    return slot;
  }

  @Transactional
  public MedicalSlot release(UUID id) {
    MedicalSlot slot =
        slots.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Cupo no encontrado"));
    if (slot.getStatus() == MedicalSlotStatus.CANCELLED || slot.getStatus() == MedicalSlotStatus.COMPLETED) {
      throw new BusinessRuleException("SLOT_NOT_RELEASABLE", "El cupo no puede liberarse en su estado actual");
    }
    transitions.assertTransition(slot.getStatus(), MedicalSlotStatus.AVAILABLE);
    slot.setStatus(MedicalSlotStatus.AVAILABLE);
    if (slot.getAvailableCapacity() == 0) {
      slot.setAvailableCapacity(1);
    }
    audit.record(currentUser.requireCurrentUser(), "MEDICAL_SLOT_RELEASED", "medical_slots", slot.getId().toString(), null, "{\"status\":\"AVAILABLE\"}");
    return slot;
  }

  public Page<MedicalSlot> scheduleForCurrentDoctor(Pageable pageable) {
    return slots.findByDoctorUserId(currentUser.requireCurrentUser().getId(), pageable);
  }
}
