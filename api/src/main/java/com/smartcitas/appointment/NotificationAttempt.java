package com.smartcitas.appointment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "notification_attempts")
public class NotificationAttempt {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "slot_offer_id", nullable = false)
  private SlotOffer slotOffer;

  @Column(nullable = false)
  private String channel;

  @Column(name = "destination_masked")
  private String destinationMasked;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private NotificationStatus status;

  @Column(name = "provider_reference")
  private String providerReference;

  @Column(nullable = false)
  private int attempts = 1;

  @Column(name = "sent_at")
  private OffsetDateTime sentAt;

  @Column(name = "delivered_at")
  private OffsetDateTime deliveredAt;

  @Column(name = "error_message")
  private String errorMessage;
}
