package app.linka.android

import org.junit.Assert.assertEquals
import org.junit.Test

class CaptureFilteringTest {
    private val captures = listOf(
        Capture("n1", "A simple note", 100L, 100L, false),
        Capture("l1", "https://example.com", 200L, 200L, false),
        Capture("p1", "Pinned idea", 300L, 300L, true),
        Capture("n2", "Another NOTE", 400L, 400L, false)
    )

    @Test fun pinnedItemsAppearFirst() {
        assertEquals("p1", filterCaptures(captures, "all", "").first().id)
    }

    @Test fun linksFilterOnlyReturnsHttpLinks() {
        assertEquals(listOf("l1"), filterCaptures(captures, "links", "").map { it.id })
    }

    @Test fun notesFilterExcludesLinks() {
        // Pinned notes are still notes; only URL captures are excluded.
        assertEquals(listOf("p1", "n2", "n1"), filterCaptures(captures, "notes", "").map { it.id })
    }

    @Test fun searchIsCaseInsensitive() {
        assertEquals(listOf("n2", "n1"), filterCaptures(captures, "all", "note").map { it.id })
    }

    @Test fun searchMatchesLinkDomainWithoutProtocol() {
        assertEquals(listOf("l1"), filterCaptures(captures, "all", "example.com").map { it.id })
    }

    @Test fun searchMatchesExtractedPreviewText() {
        val enriched = captures.map {
            if (it.id == "l1") it.copy(previewTitle = "Baku architecture", previewDescription = "A photo essay")
            else it
        }
        assertEquals(listOf("l1"), filterCaptures(enriched, "all", "architecture").map { it.id })
        assertEquals(listOf("l1"), filterCaptures(enriched, "all", "photo essay").map { it.id })
    }

    @Test fun pinnedFilterOnlyReturnsPinnedItems() {
        assertEquals(listOf("p1"), filterCaptures(captures, "pinned", "").map { it.id })
    }
}
