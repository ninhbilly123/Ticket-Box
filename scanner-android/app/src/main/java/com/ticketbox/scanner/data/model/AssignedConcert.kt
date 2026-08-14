package com.ticketbox.scanner.data.model

data class AssignedConcert(
    val id: String,
    val name: String,
    val venue: String,
    val startAt: String,
    val gateIds: List<String>
)
