package com.smartcitas.common;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.smartcitas.appointment.AppointmentStatus;
import com.smartcitas.appointment.SlotOfferStatus;
import org.junit.jupiter.api.Test;

class StateTransitionServiceTest {

  private final StateTransitionService service = new StateTransitionService();

  @Test
  void allowsValidOfferTransition() {
    assertThatCode(() -> service.assertTransition(SlotOfferStatus.PENDING, SlotOfferStatus.ACCEPTED))
        .doesNotThrowAnyException();
  }

  @Test
  void rejectsInvalidOfferTransition() {
    assertThatThrownBy(() -> service.assertTransition(SlotOfferStatus.ACCEPTED, SlotOfferStatus.PENDING))
        .isInstanceOf(BusinessRuleException.class)
        .hasMessageContaining("ACCEPTED -> PENDING");
  }

  @Test
  void rejectsInvalidAppointmentTransition() {
    assertThatThrownBy(() -> service.assertTransition(AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED))
        .isInstanceOf(BusinessRuleException.class)
        .hasMessageContaining("COMPLETED -> CONFIRMED");
  }
}
