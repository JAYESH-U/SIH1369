require("dotenv").config();
const fs = require('fs');
const pdf = require('pdf-parse');
const axios = require('axios');

async function readPDFFile(filePath) {
	const dataBuffer = fs.readFileSync(filePath);
	const data = await pdf(dataBuffer);
	return data.text;
}

async function checkPlagiarism(filePath) {
	const text = await readPDFFile(filePath);
	// console.log(text);

	const options = {
		method: 'POST',
		url: 'https://plagiarism-checker-and-auto-citation-generator-multi-lingual.p.rapidapi.com/plagiarism',
		headers: {
			'content-type': 'application/json',
			'X-RapidAPI-Key': process.env.RKEY,
			'X-RapidAPI-Host': process.env.RHOST
		},
		data: {
			text: text,
			language: 'en',
			includeCitations: false,
			scrapeSources: false
		}
	};

	try {
		const response = await axios.request(options);
		const percentPlagiarism = response.data.percentPlagiarism;
		return percentPlagiarism;
	} catch (error) {
		console.error('Error checking plagiarism:', error);
		return null; // or handle the error as needed
	}
}

module.exports = {
	checkPlagiarism
};
