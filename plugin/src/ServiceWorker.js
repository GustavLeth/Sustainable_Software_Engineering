let localIntensity;
let requestMap = new Map();
const backendUrl = "http://localhost:3000";
const getLocalIPUrl = "http://api.ipaddress.com/myip?format=json";

const extractHostname = (url) => {
    let hostname = url.indexOf("//") > -1 ? url.split('/')[2] : url.split('/')[0];
    // find & remove port number
    hostname = hostname.split(':')[0];
    // find & remove "?"
    hostname = hostname.split('?')[0];
    return hostname;
  };

  const writeToStorage = () => {
      chrome.storage.local.set({ storageKey: JSON.stringify([...requestMap]) });
  };
  
  const onHeadersReceivedListener = (requestDetails) => {
    const {initiator, url, responseHeaders} = requestDetails;
    const origin = extractHostname(initiator ?? url);
    const responseHeadersContentLength = responseHeaders.find(header => header.name.toLowerCase() === "content-length");
    const contentLength = responseHeadersContentLength ?? {value: 0};
    if (contentLength.value > 0) {
      const request = requestMap.get(origin) ?? {}
      const size = parseInt(contentLength.value, 10) + requestMap.get(origin)?.size ?? 0;
      requestMap.set(origin, {...request, size, origin});
    }
  };
  
  // extracts the ip and the intensity and puts it in the map-
  const onResponseStartedListener = async(response) => {
    console.log('response', response);
    const {ip, initiator, url, statusCode} = response;
    if(ip == "::1" || statusCode > 299) {
      return;
    }
    const origin = extractHostname(initiator ?? url);
      const request = requestMap.get(origin);
      console.log('request', JSON.stringify(request));
      if (!request?.intensity) {
        // add ip address to our request.
        request.ip = ip;
        // if we don't have the intensity of this origin we find it.
          try {
          const intensity = await getCarbonIntensity(ip);
          request.intensity = !isNaN(intensity) ? intensity : 1;
          // just to be safe if the local ip couldn't be found. It shouldn't be a problem now since we ping an external service.
          // In the future we will pull it from the backend.
          if(!localIntensity) {
            localIntensity = intensity;
          }
      } catch (error) {
        console.log(error);
      }
      requestMap.set(origin, request);
    }
  }

  const getCarbonIntensity = async(ip) => {
      const response = await fetch(`${backendUrl}/co2/${ip}`).then(function(res) {
        if (!res.ok) {
            throw new Error(`HTTP status ` + res.status + ` ${ip} not found`);
        }
        return res.json();
    });
      return response;
    };
    // calls an external service to get the ip.
    const getLocalIp = async() => {
      const response = fetch(getLocalIPUrl)
      .then(res => res.json())
      .then(data => { return data.ipaddress });
      return response;
    };

    const handleMessage = (request) => {
      if ('reset' === request.action) {
        requestMap = new Map();
        chrome.storage.local.set({ storageKey: JSON.stringify([...requestMap])});
      }
    }

    const start = () => {
      chrome.webRequest.onHeadersReceived.addListener(
        onHeadersReceivedListener,
        {urls: ['<all_urls>']},
        ['responseHeaders']
      );
      chrome.webRequest.onResponseStarted.addListener(
        onResponseStartedListener,
        {urls: ['*://*/*']}
      );
      // the reset command from the page.
      chrome.runtime.onMessage.addListener(handleMessage);
      // get's the map of origins
      chrome.storage.local.get("storageKey").then(async(result) => {
        setInterval(writeToStorage, 500);
        if (result?.storageKey && result.storageKey != "[]") {
          requestMap = new Map(JSON.parse(result.storageKey));
        }
      });
      // fetch the local intensity.
      chrome.storage.local.get("localIntensity").then(async(result) => {
        // if our intensity is less than an hour old we keep it.
        if(result && result.time < Date.now() - 1000*60*60 && result.intensity) {
            localIntensity = result.intensity;
        } else {
          const localIP = await getLocalIp();
          localIntensity = await getCarbonIntensity(localIP);
          const intensityObj = {intensity: localIntensity, time: Date.now()};
          chrome.storage.local.set({ localIntensity: JSON.stringify(intensityObj) });
        }
    });
  };

start();
    