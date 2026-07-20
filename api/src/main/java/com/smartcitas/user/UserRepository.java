package com.smartcitas.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findBySupabaseUserId(UUID supabaseUserId);

  Optional<User> findByEmailIgnoreCase(String email);

  @Query(
      """
      select u from User u
      where :search is null
        or lower(u.email) like lower(concat('%', :search, '%'))
        or lower(coalesce(u.firstName, '')) like lower(concat('%', :search, '%'))
        or lower(coalesce(u.lastName, '')) like lower(concat('%', :search, '%'))
        or lower(coalesce(u.documentNumber, '')) like lower(concat('%', :search, '%'))
      """)
  Page<User> search(String search, Pageable pageable);
}
