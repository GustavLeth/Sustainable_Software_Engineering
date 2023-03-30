const express = require('express');
const fs = require('fs');
const moment = require('moment');
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const electricitymapsApiKey = process.env.ELECTRICITYMAPS_KEY;

var cors = require('cors');
const app = express()
const port = 3000
const DT_FMT = 'YYMMDDHH'

const corsOpts = {
  origin: '*',

  methods: [
    'GET',
    'POST',
  ],

  allowedHeaders: [
    'Content-Type',
  ],
};

app.use(cors(corsOpts));

function getCarbonData(countryCode) {
  const cutoffTime = moment().subtract(47, 'hours'); // 47 hours ago from current time, should be safe since the forecast is for 48 hours.
  const files = fs.readdirSync('../carbon_data');

  // Filter files by country code and updated time
  const recentFiles = files.filter(file => {
    if (file.includes(countryCode)) {
      const fileTime = moment(file.substring(0, 14), DT_FMT);
      return fileTime.isAfter(cutoffTime);
    }
    return false;
  });

  // Sort files by timestamp in descending order
  recentFiles.sort((a, b) => {
    const aTime = moment(a.substring(0, 14), DT_FMT);
    const bTime = moment(b.substring(0, 14), DT_FMT);
    return bTime.diff(aTime);
  });

  // If saved file, return contents. Otherwise, make new API call, save and
  // return contents.
  if (recentFiles.length > 0) {
    const latestFile = recentFiles[0];
    const filePath = `../carbon_data/${latestFile}`;
    const carbonData = fs.readFileSync(filePath, 'utf8');
    return Promise.resolve(JSON.parse(carbonData));
  } else {
    return fetchCarbonData(countryCode)
      .then(carbonData => {
        return saveCarbonData(carbonData);
      });
  }
}

function saveCarbonData(data) {
  console.log('saveCarbonData data', data);
  const updatedAt = moment(data.forecast[0].datetime).format(DT_FMT);
  const zone = data.zone;
  const filename = `../carbon_data/${updatedAt}_${zone}.txt`;

  fs.writeFile(filename, JSON.stringify(data), (err) => {
    if (err) {
      console.error(`Error saving data to file ${filename}: ${err}`);
    } else {
      console.log(`Data saved to file ${filename}`);
    }
  });
  return data;
}

async function fetchCarbonData(countryCode) {
  const {default: fetch} = await import('node-fetch');
  //API Key and Country Code are hard-coded here for the moment!
  const options = {
  method: 'GET',
  headers: {
      'X-BLOBR-KEY': 'O4cqkTdqtyH68Yn8cw54nEFZqE43rALe',
    },
  };
  const url = `https://api-access.electricitymaps.com/2w97h07rvxvuaa1g/carbon-intensity/forecast?zone=${countryCode}`;
  const response = await fetch(url, options);
  const data = await response.json();
  return data;
}


function getCurrentCarbonIntensity(countryCode) {
  return getCarbonData(countryCode)
    .then(data => {
      const now = new Date();
      const currentData = data.forecast.find(d => new Date(d.datetime) <= now);
      return currentData.carbonIntensity;
    })
    .catch(error => {
      console.error(error);
      return null;
    });
}

async function fetchCountryCodeFromIp(ip) {
  const {default: fetch} = await import('node-fetch');
  const url = `https://ipinfo.io/${ip}?token=dada096b45743a`
  const response = await fetch(url);
  const data = await response.json();
  console.log('fetchCountryCodeFromIp response', data);
  return data.country;
}

async function getCountryCodeFromIp(ip) {
  const filePath = "../ip_data/ip_country_code.csv";
  const fileData = await readFileAsync(filePath, "utf8");
  const lines = fileData.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const [fileIp, countryCode] = lines[i].split(",");
    if (fileIp === ip) {
      console.log("Found ip in db, no api call.")
      return countryCode.trim();
    }
  }
  console.log('Did not find ip in db');
  const countryCode = await fetchCountryCodeFromIp(ip);
  if(countryCode) await writeFileAsync(filePath, `${ip},${countryCode}\n`, { flag: "a" });
  return countryCode;
}

app.get('/co2/:ip', (req, res) => {
  console.log('req.socket.remoteAddress', req.socket.remoteAddress);
  const ip_address = req.params.ip;
  getCountryCodeFromIp(ip_address)
    .then(countryCode => {
      console.log("Given ip", ip_address, "is in", countryCode);
      return getCurrentCarbonIntensity(countryCode);
    })
    .then(intensity => {
      console.log('intensity', intensity);
      if(intensity) {
        console.log("sent intensity", intensity)
        res.send(intensity.toString());
      } else {
        res.status(404);
        res.send();
    }
    })
    .catch(error => {
      console.error(error);
      res.send('Error occurred!');
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});
