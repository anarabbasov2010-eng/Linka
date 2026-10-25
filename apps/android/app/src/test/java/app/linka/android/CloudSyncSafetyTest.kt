package app.linka.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import java.util.concurrent.TimeUnit

class CloudSyncSafetyTest {
    private fun capture(id: String, updatedAt: Long = 1L, pinned: Boolean = false) = Capture(
        id = id,
        text = "Note $id",
        createdAt = updatedAt,
        updatedAt = updatedAt,
        pinned = pinned
    )

    @Test
    fun conditionalPatchUsesPatchCapableHttpClientAndSendsRevisionHeaders() {
        val server = MockWebServer()
        val response = """[{"user_id":"user-test","updated_at":"2026-10-25T08:00:01+00:00"}]"""
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(response)
        )
        server.start()
        try {
            val body = """{"data":{"captures":[],"deletedIds":[]},"updated_at":"2026-10-25T08:00:01+00:00"}"""
            val result = requestJson(
                server.url("/rest/v1/linka_sync?user_id=eq.user-test&updated_at=eq.2026-10-25T08%3A00%3A00%2B00%3A00").toString(),
                "PATCH",
                "public-test-key",
                "access-token",
                body,
                "return=representation"
            )
            assertEquals(response, result)

            val recorded = server.takeRequest(2, TimeUnit.SECONDS)
                ?: throw AssertionError("Android did not send the conditional PATCH request.")
            assertEquals("PATCH", recorded.method)
            assertEquals("public-test-key", recorded.getHeader("apikey"))
            assertEquals("Bearer access-token", recorded.getHeader("Authorization"))
            assertEquals("return=representation", recorded.getHeader("Prefer"))
            assertEquals(body, recorded.body.readUtf8())
            assertTrue(recorded.path.orEmpty().contains("updated_at=eq."))
        } finally {
            server.shutdown()
        }
    }

    @Test
    fun conditionalPatchReportsPayloadLimitAsActionableError() {
        val server = MockWebServer()
        server.enqueue(
            MockResponse()
                .setResponseCode(413)
                .setHeader("Content-Type", "application/json")
                .setBody("""{"message":"Payload too large"}""")
        )
        server.start()
        try {
            val error = org.junit.Assert.assertThrows(IllegalStateException::class.java) {
                requestJson(
                    server.url("/rest/v1/linka_sync").toString(),
                    "PATCH",
                    "public-test-key",
                    "access-token",
                    """{"data":{"captures":[],"deletedIds":[]}}""",
                    "return=representation"
                )
            }
            assertTrue(error.message.orEmpty().contains("payload is too large", ignoreCase = true))
            assertTrue(error.message.orEmpty().contains("export a backup", ignoreCase = true))
        } finally {
            server.shutdown()
        }
    }

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

        val error = org.junit.Assert.assertThrows(IllegalStateException::class.java) {
            mergeCloudCapturesSafely(local, remote, emptySet(), maxCaptures = 5)
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
