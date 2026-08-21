import fs from 'fs';

const testFile = 'lib/crawl/web-crawler.test.ts';
if (fs.existsSync(testFile)) {
    let content = fs.readFileSync(testFile, 'utf8');
    // We will just skip the test file by commenting it out or renaming if it uses undici incorrectly.
    // However, I should check the exact error before deleting.
    console.log("Found web-crawler.test.ts");
}
