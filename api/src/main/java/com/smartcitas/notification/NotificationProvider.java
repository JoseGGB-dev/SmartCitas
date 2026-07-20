package com.smartcitas.notification;

import com.smartcitas.appointment.NotificationAttempt;
import com.smartcitas.appointment.NotificationAttemptRepository;
import com.smartcitas.appointment.NotificationStatus;
import com.smartcitas.appointment.SlotOffer;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;

@Service
public class NotificationProvider {

  private final NotificationAttemptRepository attempts;

  public NotificationProvider(NotificationAttemptRepository attempts) {
    this.attempts = attempts;
  }

  public void sendOffer(SlotOffer offer) {
    NotificationAttempt attempt = new NotificationAttempt();
    attempt.setSlotOffer(offer);
    attempt.setChannel("EMAIL");
    attempt.setDestinationMasked(mask(offer.getPatient().getUser().getEmail()));
    attempt.setStatus(NotificationStatus.SENT);
    attempt.setProviderReference("notification-" + offer.getId());
    attempt.setAttempts(1);
    attempt.setSentAt(OffsetDateTime.now());
    attempts.save(attempt);
  }

  private String mask(String value) {
    if (value == null || value.length() < 5) {
      return "***";
    }
    int at = value.indexOf('@');
    if (at > 1) {
      return value.charAt(0) + "***" + value.substring(at);
    }
    return value.substring(0, 2) + "***";
  }
}
