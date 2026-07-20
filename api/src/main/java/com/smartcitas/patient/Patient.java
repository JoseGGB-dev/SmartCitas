package com.smartcitas.patient;

import com.smartcitas.common.AuditedUuidEntity;
import com.smartcitas.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "patients")
public class Patient extends AuditedUuidEntity {

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Column(name = "insurance_number", unique = true)
  private String insuranceNumber;

  @Column(name = "birth_date")
  private LocalDate birthDate;

  private String sex;

  private String phone;

  @Column(name = "preferred_contact_channel")
  private String preferredContactChannel;

  @Column(name = "chronic_condition", nullable = false)
  private boolean chronicCondition;

  @Column(nullable = false)
  private boolean active = true;
}
