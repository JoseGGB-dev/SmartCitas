package com.smartcitas.appointment;

import com.smartcitas.patient.Patient;
import com.smartcitas.slot.MedicalSlot;
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
@Table(name = "slot_offers")
public class SlotOffer {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "medical_slot_id", nullable = false)
  private MedicalSlot medicalSlot;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "waiting_list_entry_id", nullable = false)
  private WaitingListEntry waitingListEntry;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "patient_id", nullable = false)
  private Patient patient;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SlotOfferStatus status = SlotOfferStatus.PENDING;

  @Column(name = "offered_at", nullable = false)
  private OffsetDateTime offeredAt;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "responded_at")
  private OffsetDateTime respondedAt;

  @Column(name = "unique_token", nullable = false, unique = true)
  private String uniqueToken;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;
}
