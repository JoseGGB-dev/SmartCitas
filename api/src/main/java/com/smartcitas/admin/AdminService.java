package com.smartcitas.admin;

import com.smartcitas.appointment.AppointmentRepository;
import com.smartcitas.appointment.AppointmentStatus;
import com.smartcitas.appointment.SlotOfferRepository;
import com.smartcitas.appointment.SlotOfferStatus;
import com.smartcitas.appointment.WaitingListEntryRepository;
import com.smartcitas.appointment.WaitingListStatus;
import com.smartcitas.audit.AuditService;
import com.smartcitas.common.ResourceNotFoundException;
import com.smartcitas.common.dto.ApiDtos.RoleUpdateRequest;
import com.smartcitas.common.dto.ApiDtos.StatisticsResponse;
import com.smartcitas.role.Role;
import com.smartcitas.role.RoleRepository;
import com.smartcitas.security.CurrentUserService;
import com.smartcitas.slot.MedicalSlotRepository;
import com.smartcitas.user.User;
import com.smartcitas.user.UserRepository;
import java.util.LinkedHashSet;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

  private final UserRepository users;
  private final RoleRepository roles;
  private final WaitingListEntryRepository waitingList;
  private final MedicalSlotRepository slots;
  private final SlotOfferRepository offers;
  private final AppointmentRepository appointments;
  private final CurrentUserService currentUser;
  private final AuditService audit;

  public AdminService(
      UserRepository users,
      RoleRepository roles,
      WaitingListEntryRepository waitingList,
      MedicalSlotRepository slots,
      SlotOfferRepository offers,
      AppointmentRepository appointments,
      CurrentUserService currentUser,
      AuditService audit) {
    this.users = users;
    this.roles = roles;
    this.waitingList = waitingList;
    this.slots = slots;
    this.offers = offers;
    this.appointments = appointments;
    this.currentUser = currentUser;
    this.audit = audit;
  }

  public Page<User> searchUsers(String search, Pageable pageable) {
    return users.search(search, pageable);
  }

  @Transactional
  public User updateRoles(UUID userId, RoleUpdateRequest request) {
    User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
    java.util.List<Role> newRoles = roles.findByCodeIn(request.roles());
    user.setRoles(new LinkedHashSet<>(newRoles));
    audit.record(currentUser.requireCurrentUser(), "USER_ROLES_UPDATED", "users", user.getId().toString(), null, "{\"roles\":\"updated\"}");
    return user;
  }

  public StatisticsResponse statistics() {
    return new StatisticsResponse(
        users.count(),
        waitingList.search(WaitingListStatus.ACTIVE, null, Pageable.unpaged()).getTotalElements(),
        slots.count(),
        offers.findAll().stream().filter(offer -> offer.getStatus() == SlotOfferStatus.PENDING).count(),
        appointments.findAll().stream().filter(appointment -> appointment.getStatus() == AppointmentStatus.CONFIRMED).count());
  }
}
