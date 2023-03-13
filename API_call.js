const fs = require('fs');
const moment = require('moment');
const DT_FMT = 'YYMMDDHH'

//API Key and Country Code are hard-coded here for the moment!
const zone = 'NL'
const options = {
  method: 'GET',
  headers: {
    'X-BLOBR-KEY': '0fxlgCW4i8k9pXutI6UpvHsLFCv9VPc4',
  },
};

function getCarbonData(countryCode) {
  const cutoffTime = moment().subtract(47, 'hours'); // 47 hours ago from current time, should be safe since the forecast is for 48 hours.
  const files = fs.readdirSync('./carbon_data');

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
    const filePath = `./carbon_data/${latestFile}`;
    const carbonData = fs.readFileSync(filePath, 'utf8');
    return carbonData;
  } else {
    fetchCarbonData()
      .then(carbonData => {
        saveCarbonData(carbonData);
        return carbonData;
      });
  }
}

function saveCarbonData(data) {
  const updatedAt = moment(data.forecast[0].datetime).format(DT_FMT);
  const zone = data.zone;
  const filename = `./carbon_data/${updatedAt}_${zone}.txt`;

  fs.writeFile(filename, JSON.stringify(data), (err) => {
    if (err) {
      console.error(`Error saving data to file ${filename}: ${err}`);
    } else {
      console.log(`Data saved to file ${filename}`);
    }
  });
}

async function fetchCarbonData() {
  const {default: fetch} = await import('node-fetch');
  const url = `https://api-access.electricitymaps.com/2w97h07rvxvuaa1g/carbon-intensity/forecast?zone=${zone}`;
  const response = await fetch(url, options);
  const data = await response.json();
  return data;
}

getCarbonData(zone);
