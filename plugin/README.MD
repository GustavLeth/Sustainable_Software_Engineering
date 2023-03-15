#### Development guide

First you need to add the plugin to your browser. Go to extensions by clicking the extension icon in chrome -> and then manage extensions. Click on "developer mode" in the top left, and afterwards click load unpacked. Navigate to this directory, and click this. This will load the "Hello extensions" into your extension directory. It has an error log if errors are present in the plugin. You can now click the extension icon in the top right, and pin this plugin to your bar.

I think we only need one html file, the content in the html file is shown when you click on the extension.
To input js into the html file, you write <script src="file_name.js"></script>
For debugging purposes you write console.log in your javascipt. If you wan't to see the content of your debugging then you have to click on the extension in the top (alternatively you can ping it), right click it, click "inspect" and then find the console in the chrome developer tools. How to inspect is shown in the screenshot in documentation/inspect.png
 