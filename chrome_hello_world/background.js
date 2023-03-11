chrome.contextMenus.create ({
    "title": "Hello World",
    "contexts": ["selection"],
    "onclick":  chrome.tabs.update({
     url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"});

});
