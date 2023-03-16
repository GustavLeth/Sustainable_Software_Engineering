import axios from "axios";
const api = "";
// declare a method to search by country name
const searchForCountry = async countryName => {
  try {
    const response = await axios.get(`${api}/${countryName}`);
    console.log('response', response);
  } catch (error) {
    console.log('error', error)
  }
};

// declare a function to handle form submission
const handleSubmit = async e => {
  e.preventDefault();
  searchForCountry(country.value);
  console.log(country.value);
};
searchForCountry("Denmark");

// form.addEventListener("submit", e => handleSubmit(e));
