let REQUESTS_STORAGE = [],
    VERSION = '1.4',
    PAUSE_MILLISECONDS = 7000,
    output_div = document.getElementById('output');

let download_requests_json = () => {
    var blob = new Blob([
        JSON.stringify({
            meta: {
                extension_version: VERSION
            },
            data: REQUESTS_STORAGE
        })
    ], {type: "application/json"});
    var url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url
    });
}

let save_request_generator = (filter_str) => {
    let substrings = filter_str.split(',')
    return (request) => {
        if (substrings.some(function(v) { return request.request.url.indexOf(v) >= 0; })) {
            REQUESTS_STORAGE.push(request)
        }
    }
}
let request_saver = save_request_generator('')

// display version number
document.getElementById('version').innerHTML = VERSION;

// listen to click
document.getElementById('go').addEventListener('click', function () {

    // clear out storage and output
    REQUESTS_STORAGE = []
    output_div.innerHTML = ""

    // listen to network requests
    chrome.extension.onRequest.removeListener(request_saver);
    request_saver = save_request_generator(document.getElementById('filter').value);
    chrome.devtools.network.onRequestFinished.addListener(request_saver);

    // get URLS
    let urls = document.getElementById('urls').value.split("\n").map(function (item) {
        return item.trim();
    });

    let ith_url = 0;
    (function page_loop() {

        // report to output
        output_div.innerHTML += `(${ith_url + 1} of ${urls.length}) ${urls[ith_url]}`;
        let progress_bar_id = Math.random().toString(36).substring(7);
        output_div.innerHTML += `<progress value="0" max="${PAUSE_MILLISECONDS}" id="${progress_bar_id}"></progress><br/>`;

        // visit URL
        chrome.devtools.inspectedWindow.eval(`window.location.href = '${urls[ith_url]}'`);

        // progress bar
        (function progress_bar_loop(time_left, bar_id) {
            let refresh_progress_ms = 500;
            document.getElementById(bar_id).value = PAUSE_MILLISECONDS - time_left;
            setTimeout(() => progress_bar_loop(time_left - refresh_progress_ms, bar_id), refresh_progress_ms);
        })(PAUSE_MILLISECONDS, progress_bar_id);

        // increment
        ith_url++;

        if (ith_url < urls.length) {
            setTimeout(page_loop, PAUSE_MILLISECONDS);
        } else {
            setTimeout(download_requests_json, PAUSE_MILLISECONDS);
        }
    })();


}, false);
