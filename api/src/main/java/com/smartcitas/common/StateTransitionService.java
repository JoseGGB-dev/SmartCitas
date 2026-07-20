package com.smartcitas.common;

import com.smartcitas.appointment.AppointmentRequestStatus;
import com.smartcitas.appointment.AppointmentStatus;
import com.smartcitas.appointment.SlotOfferStatus;
import com.smartcitas.appointment.WaitingListStatus;
import com.smartcitas.slot.MedicalSlotStatus;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class StateTransitionService {

  private static final Map<Class<? extends Enum<?>>, Map<String, Set<String>>> RULES =
      Map.of(
          AppointmentRequestStatus.class,
          Map.of(
              "DRAFT", Set.of("SUBMITTED", "CANCELLED"),
              "SUBMITTED", Set.of("WAITING", "CANCELLED"),
              "WAITING", Set.of("OFFERED", "SCHEDULED", "CANCELLED", "CLOSED"),
              "OFFERED", Set.of("WAITING", "SCHEDULED", "CANCELLED", "CLOSED"),
              "SCHEDULED", Set.of("CLOSED", "CANCELLED"),
              "CANCELLED", Set.of(),
              "CLOSED", Set.of()),
          WaitingListStatus.class,
          Map.of(
              "ACTIVE", Set.of("TEMPORARILY_OFFERED", "CANCELLED"),
              "TEMPORARILY_OFFERED", Set.of("ASSIGNED", "REJECTED", "EXPIRED", "ACTIVE", "CANCELLED"),
              "ASSIGNED", Set.of(),
              "REJECTED", Set.of(),
              "EXPIRED", Set.of("ACTIVE"),
              "CANCELLED", Set.of()),
          MedicalSlotStatus.class,
          Map.of(
              "AVAILABLE", Set.of("RESERVED", "FULL", "CANCELLED", "COMPLETED"),
              "RESERVED", Set.of("AVAILABLE", "FULL", "CANCELLED", "COMPLETED"),
              "FULL", Set.of("AVAILABLE", "COMPLETED", "CANCELLED"),
              "CANCELLED", Set.of(),
              "COMPLETED", Set.of()),
          SlotOfferStatus.class,
          Map.of(
              "PENDING", Set.of("ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"),
              "ACCEPTED", Set.of(),
              "REJECTED", Set.of(),
              "EXPIRED", Set.of(),
              "CANCELLED", Set.of()),
          AppointmentStatus.class,
          Map.of(
              "PENDING_CONFIRMATION", Set.of("CONFIRMED", "CANCELLED"),
              "CONFIRMED", Set.of("COMPLETED", "NO_SHOW", "CANCELLED"),
              "CANCELLED", Set.of(),
              "COMPLETED", Set.of(),
              "NO_SHOW", Set.of()));

  public <E extends Enum<E>> void assertTransition(E current, E next) {
    if (current == next) {
      return;
    }
    Set<String> allowed =
        RULES.getOrDefault(current.getDeclaringClass(), Map.of())
            .getOrDefault(current.name(), Set.of());
    if (!allowed.contains(next.name())) {
      throw new BusinessRuleException(
          "INVALID_STATE_TRANSITION",
          "Transicion no permitida: " + current.name() + " -> " + next.name());
    }
  }
}
