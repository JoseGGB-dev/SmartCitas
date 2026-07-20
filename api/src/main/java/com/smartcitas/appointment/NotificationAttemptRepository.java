package com.smartcitas.appointment;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationAttemptRepository extends JpaRepository<NotificationAttempt, UUID> {}
