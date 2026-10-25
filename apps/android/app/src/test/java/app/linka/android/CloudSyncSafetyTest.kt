package app.linka.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class CloudSyncSafetyTest {
    private fun capture(id: String, updatedAt: Long = 1L, pinned: Boolean = false) = Capture(
        id = id,
        text = "Note $id",
        createdAt = updatedAt,
        updatedAt = updatedAt,
        pinned = pinned
    )

    @Test
    fun mergeWithinLimitKeepsDistinctCapturesAndDropsTombstonedItems() {
        val merged = mergeCloudCapturesSafely(
            localCaptures = listOf(capture("local", 10L), capture("deleted-local", 9L)),
            remoteCaptures = listOf(capture("remote", 20L), capture("deleted-remote", 8L)),
            deletedIds = setOf("deleted-local", "deleted-remote"),
            maxCaptures = 2
        )

        assertEquals(listOf("remote", "local"), merged.map { it.id })
    }

    @Test
    fun oversizedCloudMergeFailsInsteadOfSilentlyTruncating() {
        val local = (0 until 3).map { capture("local-$it", it.toLong()) }
        val remote = (0 until 3).map { capture("remote-$it", (10 + it).toLong()) }

        val error = try {
            mergeCloudCapturesSafely(local, remote, emptySet(), maxCaptures = 5)
            fail("Expected oversized sync to be rejected")
            return
        } catch (expected: IllegalStateException) {
            expected
        }

        assertTrue(error.message.orEmpty().contains("cloud merge contains 6"))
        assertTrue(error.message.orEmpty().contains("before writing"))
        assertTrue(error.message.orEmpty().contains("Linka Web or Windows"))
    }

    @Test
    fun tombstoneUnionDoesNotDiscardEntriesBeyondFormerFiveThousandLimit() {
        val local = (0 until 3_000).map { "local-$it" }.toSet()
        val remote = (0 until 3_000).map { "remote-$it" }

        val merged = mergeCloudDeletedIds(local, remote)

        assertEquals(6_000, merged.size)
        assertTrue(merged.contains("local-0"))
        assertTrue(merged.contains("local-2999"))
        assertTrue(merged.contains("remote-0"))
        assertTrue(merged.contains("remote-2999"))
    }

    @Test
    fun mergePrefersTheNewestVersionForDuplicateIds() {
        val merged = mergeCloudCapturesSafely(
            localCaptures = listOf(capture("same", 20L)),
            remoteCaptures = listOf(capture("same", 10L), capture("remote", 15L)),
            deletedIds = emptySet(),
            maxCaptures = 2
        )

        assertEquals(2, merged.size)
        assertEquals(20L, merged.first { it.id == "same" }.updatedAt)
    }
}
