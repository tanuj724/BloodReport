const express = require('express');
const router = express.Router();
const axios = require('axios');
const Report = require('../models/report'); // MongoDB model

// GET: Start at patient info form
router.get('/', (req, res) => {
  res.render('patientInfo');
});

// Only show error if passed explicitly
router.get('/test-selection', (req, res) => {
  const patient = req.session.patient || {};
  res.render('testSelection', { patient, error: null });
});

// Dashboard page (show only current patient's reports)
router.get('/dashboard', async (req, res) => {
  const patient = req.session.patient || {};
  let reports = [];
  if (patient && patient.name && patient.age && patient.gender) {
    reports = await require('../models/report').find({
      'patient.name': patient.name,
      'patient.age': Number(patient.age),
      'patient.gender': patient.gender
    }).sort({ createdAt: -1 });
  }
  res.render('dashboard', { patient, reports });
});

// Previous Reports page (filtered by current patient)
router.get('/previous-reports', async (req, res) => {
  const patient = req.session.patient || {};
  let reports = [];
  if (patient && patient.name && patient.age && patient.gender) {
    reports = await require('../models/report').find({
      'patient.name': patient.name,
      'patient.age': Number(patient.age),
      'patient.gender': patient.gender
    }).sort({ createdAt: -1 });
  }
  res.render('previousReports', { reports });
});

// Help page
router.get('/help', (req, res) => {
  res.render('help');
});

//POST: After patient info → save to session → go to dashboard
router.post('/dashboard', async (req, res) => {
  req.session.patient = req.body;
  const reports = await require('../models/report').find({});
  res.render('dashboard', { patient: req.body, reports });
});

router.post('/test-readings', (req, res) => {
  let selected = req.body.testType;

  // Fix: handle both single and multiple selections, and no selection
  let selectedTests = [];
  if (Array.isArray(selected)) {
    selectedTests = selected;
  } else if (typeof selected === "string") {
    selectedTests = [selected];
  }

  // Check if no test is selected
  if (!selected || selectedTests.length === 0 || selectedTests[0] === undefined) {
    const patient = req.session.patient || {};
    return res.render('testSelection', {
      patient,
      error: 'Please select at least one test to proceed.'
    });
  }

  req.session.selectedTests = selectedTests;

  res.render('testReadings', { selectedTests });
});

router.post('/result', async (req, res) => {
  const readings = req.body;
  const patient = req.session.patient || {};
  const testTypes = req.session.selectedTests || [];

  // Build a readable report string
  let reportText = `Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}\n`;
  reportText += `Selected Tests: ${testTypes.join(', ')}\n`;

  for (let key in readings) {
    reportText += `${key}: ${readings[key]}\n`;
  }


  let aiResponse = "No summary generated.";
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is missing. Please check your .env file.');
    aiResponse = "OpenAI API key is missing. Please contact the administrator.";
  } else {
    try {
      const openaiRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful medical assistant." },
            {
              role: "user", content: `Analyze this blood report or symptoms and provide a concise summary as an HTML table with the following columns: Parameter, Value, Normal Range, Interpretation, Possible Causes, Symptoms, Suggestions(for diet and any other that can help). Fill tokens based on the data. After the table, add a short summary describing the possible disease and conditions in a <div class="ai-summary">...</div>.
IMPORTANT: Return ONLY the HTML table and summary. DO NOT include any code block, markdown, or triple backticks. 
Blood report or symptoms:\n${reportText}`
            }
          ],
          max_tokens: 1500,
          temperature: 0.5
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      aiResponse = openaiRes.data.choices[0].message.content.trim();
    }
    catch (err) {
      // Improved error logging for debugging
      if (err.response && err.response.data) {
        console.error('OpenAI Error:', err.message, JSON.stringify(err.response.data));
        aiResponse = "AI summary could not be generated due to an error: ";
      } else {
        console.error('OpenAI Error:', err.message);
        aiResponse = "AI summary could not be generated due to an error: ";
      }
    }
  }

  // Save report to MongoDB
  const newReport = new Report({
    patient,
    testTypes,
    readings,
    aiAnalysis: aiResponse
  });

  await newReport.save();

  // Show result page
  res.render('result', {
    patient,
    testTypes,
    readings,
    aiResponse
  });
});

// Report Details Page
router.get('/report/:id', async (req, res) => {
  const report = await require('../models/report').findById(req.params.id);
  if (!report) {
    return res.status(404).send('Report not found');
  }
  res.render('reportDetails', { report });
});

module.exports = router;


module.exports = router;
