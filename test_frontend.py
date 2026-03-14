from playwright.sync_api import sync_playwright

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Test Activity Page
        print("Testing Activity Page...")
        page.goto("http://localhost:3000/activity")
        page.wait_for_load_state("networkidle")
        page.screenshot(path="activity_empty_state.png")

        # Test Album Page
        print("Testing Album Page...")
        page.goto("http://localhost:3000/album")
        page.wait_for_load_state("networkidle")
        page.screenshot(path="album_empty_state.png")

        browser.close()

if __name__ == "__main__":
    test_frontend()
