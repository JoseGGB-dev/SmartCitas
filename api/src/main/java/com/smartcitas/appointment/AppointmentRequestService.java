package com.smartcitas.appointment;

import com.smartcitas.audit.AuditService;
import com.smartcitas.common.ResourceNotFoundException;
import com.smartcitas.common.StateTransitionService;
import com.smartcitas.common.dto.ApiDtos.AppointmentRequestCreateRequest;
import com.smartcitas.facility.Facility;
import com.smartcitas.facility.FacilityRepository;
import com.smartcitas.patient.Patient;
import com.smartcitas.patient.PatientRepository;
import com.smartcitas.security.CurrentUserService;
import com.smartcitas.specialty.Specialty;
import com.smartcitas.specialty.SpecialtyRepository;
import com.smartcitas.user.User;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppointmentRequestService {

  private final CurrentUserService currentUser;
  private final PatientRepository patients;
  private final SpecialtyRepository specialties;
  private final FacilityRepository facilities;
  private final AppointmentRequestRepository requests;
  private final WaitingListEntryRepository waitingList;
  private final AuditService audit;
  private final StateTransitionService transitions;

  public AppointmentRequestService(
      CurrentUserService currentUser,
      PatientRepository patients,
      SpecialtyRepository specialties,
      FacilityRepository facilities,
      AppointmentRequestRepository requests,
      WaitingListEntryRepository waitingList,
      AuditService audit,
      StateTransitionService transitions) {
    this.currentUser = currentUser;
    this.patients = patients;
    this.specialties = specialties;
    this.facilities = facilities;
    this.requests = requests;
    this.waitingList = waitingList;
    this.audit = audit;
    this.transitions = transitions;
  }

  @Transactional
  public AppointmentRequest create(AppointmentRequestCreateRequest body) {
    User user = currentUser.requireCurrentUser();
    Patient patient =
        patients
            .findByUserId(user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Perfil de paciente no encontrado"));
    Specialty specialty =
        specialties
            .findById(body.specialtyId())
            .orElseThrow(() -> new ResourceNotFoundException("Especialidad no encontrada"));
    Facility facility =
        body.preferredFacilityId() == null
            ? null
            : facilities
                .findById(body.preferredFacilityId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));

    if (body.birthDate() != null) {
      patient.setBirthDate(body.birthDate());
    }
    if (body.chronicCondition() != null) {
      patient.setChronicCondition(body.chronicCondition());
    }

    AppointmentRequest request = new AppointmentRequest();
    request.setPatient(patient);
    request.setSpecialty(specialty);
    request.setPreferredFacility(facility);
    request.setPreferredDateFrom(body.preferredDateFrom());
    request.setPreferredDateTo(body.preferredDateTo());
    request.setPreferredTimeRange(body.preferredTimeRange());
    request.setRequestDate(OffsetDateTime.now());
    request.setStatus(AppointmentRequestStatus.SUBMITTED);
    transitions.assertTransition(AppointmentRequestStatus.SUBMITTED, AppointmentRequestStatus.WAITING);
    request.setStatus(AppointmentRequestStatus.WAITING);
    requests.save(request);

    WaitingListEntry entry = new WaitingListEntry();
    entry.setAppointmentRequest(request);
    entry.setPatient(patient);
    entry.setSpecialty(specialty);
    entry.setStatus(WaitingListStatus.ACTIVE);
    entry.setWaitingSince(OffsetDateTime.now());
    waitingList.save(entry);

    audit.record(user, "APPOINTMENT_REQUEST_CREATED", "appointment_requests", request.getId().toString(), null, "{\"status\":\"WAITING\"}");
    return request;
  }

  public Page<AppointmentRequest> listMine(Pageable pageable) {
    return requests.findByPatientUserIdOrderByCreatedAtDesc(currentUser.requireCurrentUser().getId(), pageable);
  }

  public AppointmentRequest getMine(UUID id) {
    AppointmentRequest request =
        requests.findById(id).orElseThrow(() -> new ResourceNotFoundException("Solicitud no encontrada"));
    if (!request.getPatient().getUser().getId().equals(currentUser.requireCurrentUser().getId())) {
      throw new ResourceNotFoundException("Solicitud no encontrada");
    }
    return request;
  }
}
