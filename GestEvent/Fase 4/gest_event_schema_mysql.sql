-- GestEvent — esquema relacional inicial, MySQL 8.0+
-- Tablas en plural e idioma inglés.
-- Ejecutar en una base de datos de pruebas antes de integrar al proyecto.

CREATE DATABASE IF NOT EXISTS gest_event
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE gest_event;

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMINISTRATOR', 'ORGANIZER') NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE venues (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    capacity INT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_venues_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE attendees (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_attendees_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    organizer_id BIGINT UNSIGNED NOT NULL,
    venue_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    capacity INT UNSIGNED NOT NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    PRIMARY KEY (id),
    KEY idx_events_organizer (organizer_id),
    KEY idx_events_venue (venue_id),
    KEY idx_events_start_at (start_at),
    CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_events_capacity CHECK (capacity > 0),
    CONSTRAINT chk_events_dates CHECK (end_at > start_at)
) ENGINE=InnoDB;

CREATE TABLE registrations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    attendee_id BIGINT UNSIGNED NOT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    PRIMARY KEY (id),
    CONSTRAINT uq_registrations_event_attendee UNIQUE (event_id, attendee_id),
    KEY idx_registrations_attendee (attendee_id),
    CONSTRAINT fk_registrations_event FOREIGN KEY (event_id) REFERENCES events(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_registrations_attendee FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE tickets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    registration_id BIGINT UNSIGNED NOT NULL,
    ticket_code VARCHAR(64) NOT NULL,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('ACTIVE', 'USED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (id),
    CONSTRAINT uq_tickets_registration UNIQUE (registration_id),
    CONSTRAINT uq_tickets_code UNIQUE (ticket_code),
    CONSTRAINT fk_tickets_registration FOREIGN KEY (registration_id) REFERENCES registrations(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Regla de negocio para validar en la capa de servicio antes de crear/publicar un evento:
-- events.capacity <= venues.capacity. Las validaciones de cupo disponible y estado del evento
-- deben ejecutarse de forma transaccional cuando se registre una inscripción.
