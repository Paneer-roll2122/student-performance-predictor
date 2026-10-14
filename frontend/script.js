/* =====================================================================
   Student Performance Predictor – frontend logic

   How this file is organised:
     1. Settings
     2. FIELD definitions  (the single place that describes every form input)
     3. Building the form
     4. Validation
     5. Calling the API
     6. Showing results / errors
     7. Wiring up the buttons

   To add or change an input, edit the FIELD list in section 2 only.
   Field names and allowed values must match InputData in app.py exactly.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. Settings ---------- */
  const API_BASE_URL = (
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");
  const PREDICT_URL = API_BASE_URL + "/predict";
  const REQUEST_TIMEOUT_MS = 15000;

  const MAX_GRADE = 20;
  // Friendly bands for the score. Edit freely; they are display-only.
  const GRADE_BANDS = [
    { min: 0,  tone: "risk", label: "Below the pass mark",
      note: "A predicted grade under 10 suggests this student may need extra support." },
    { min: 10, tone: "fair", label: "Satisfactory",
      note: "Predicted to pass, with room to improve." },
    { min: 14, tone: "good", label: "Good",
      note: "Predicted to perform well." },
    { min: 17, tone: "top",  label: "Excellent",
      note: "Predicted to be among the top performers." }
  ];

  /* ---------- 2. FIELD definitions ----------
     kind:      "select" (dropdown) or "number" (typed whole number)
     valueType: "int" sends a number to the API, "string" sends text
     options:   [{ value, label }] – value is exactly what the API accepts       */
  const YES_NO = [
    { value: "yes", label: "Yes" },
    { value: "no",  label: "No" }
  ];
  const JOBS = [
    { value: "at_home",  label: "At home" },
    { value: "health",   label: "Health care" },
    { value: "other",    label: "Other" },
    { value: "services", label: "Civil services" },
    { value: "teacher",  label: "Teacher" }
  ];
  const EDUCATION = [
    { value: 0, label: "0 – None" },
    { value: 1, label: "1 – Primary (up to 4th grade)" },
    { value: 2, label: "2 – 5th to 9th grade" },
    { value: 3, label: "3 – Secondary" },
    { value: 4, label: "4 – Higher education" }
  ];
  // Builds a 1–5 scale where only the ends carry a text label.
  function scale5(low, high) {
    return [1, 2, 3, 4, 5].map(function (n) {
      const text = n === 1 ? n + " – " + low : n === 5 ? n + " – " + high : String(n);
      return { value: n, label: text };
    });
  }

  const SECTIONS = [
    {
      title: "About the student",
      fields: [
        { name: "school", label: "School", kind: "select", valueType: "string",
          options: [{ value: "GP", label: "Gabriel Pereira (GP)" },
                    { value: "MS", label: "Mousinho da Silveira (MS)" }] },
        { name: "sex", label: "Sex", kind: "select", valueType: "string",
          options: [{ value: "F", label: "Female" }, { value: "M", label: "Male" }] },
        { name: "age", label: "Age", kind: "number", valueType: "int", min: 15, max: 22,
          help: "15 to 22" },
        { name: "address", label: "Home area", kind: "select", valueType: "string",
          options: [{ value: "U", label: "Urban" }, { value: "R", label: "Rural" }] },
        { name: "traveltime", label: "Home to school travel time", kind: "select", valueType: "int",
          options: [{ value: 1, label: "Under 15 min" }, { value: 2, label: "15 to 30 min" },
                    { value: 3, label: "30 min to 1 hour" }, { value: 4, label: "Over 1 hour" }] },
        { name: "health", label: "Current health", kind: "select", valueType: "int",
          options: scale5("very bad", "very good") }
      ]
    },
    {
      title: "Family",
      fields: [
        { name: "famsize", label: "Family size", kind: "select", valueType: "string",
          options: [{ value: "LE3", label: "3 or fewer" }, { value: "GT3", label: "More than 3" }] },
        { name: "Pstatus", label: "Parents live", kind: "select", valueType: "string",
          options: [{ value: "T", label: "Together" }, { value: "A", label: "Apart" }] },
        { name: "Medu", label: "Mother's education", kind: "select", valueType: "int", options: EDUCATION },
        { name: "Fedu", label: "Father's education", kind: "select", valueType: "int", options: EDUCATION },
        { name: "Mjob", label: "Mother's job", kind: "select", valueType: "string", options: JOBS },
        { name: "Fjob", label: "Father's job", kind: "select", valueType: "string", options: JOBS },
        { name: "guardian", label: "Guardian", kind: "select", valueType: "string",
          options: [{ value: "mother", label: "Mother" }, { value: "father", label: "Father" },
                    { value: "other", label: "Other" }] },
        { name: "famrel", label: "Family relationships", kind: "select", valueType: "int",
          options: scale5("very bad", "excellent") },
        { name: "famsup", label: "Family educational support", kind: "select", valueType: "string",
          options: YES_NO }
      ]
    },
    {
      title: "School and study",
      fields: [
        { name: "reason", label: "Reason for choosing this school", kind: "select", valueType: "string",
          options: [{ value: "course", label: "Course preference" }, { value: "home", label: "Close to home" },
                    { value: "reputation", label: "School reputation" }, { value: "other", label: "Other" }] },
        { name: "studytime", label: "Weekly study time", kind: "select", valueType: "int",
          options: [{ value: 1, label: "Under 2 hours" }, { value: 2, label: "2 to 5 hours" },
                    { value: 3, label: "5 to 10 hours" }, { value: 4, label: "Over 10 hours" }] },
        { name: "failures", label: "Past class failures", kind: "select", valueType: "int",
          options: [{ value: 0, label: "0" }, { value: 1, label: "1" },
                    { value: 2, label: "2" }, { value: 3, label: "3" }] },
        { name: "absences", label: "School absences", kind: "number", valueType: "int", min: 0, max: 100,
          help: "Number of absences, 0 or more" },
        { name: "schoolsup", label: "Extra school support", kind: "select", valueType: "string", options: YES_NO },
        { name: "paid", label: "Paid extra classes", kind: "select", valueType: "string", options: YES_NO },
        { name: "nursery", label: "Attended nursery school", kind: "select", valueType: "string", options: YES_NO },
        { name: "higher", label: "Wants higher education", kind: "select", valueType: "string", options: YES_NO }
      ]
    },
    {
      title: "Lifestyle",
      fields: [
        { name: "activities", label: "Extracurricular activities", kind: "select", valueType: "string", options: YES_NO },
        { name: "internet", label: "Internet at home", kind: "select", valueType: "string", options: YES_NO },
        { name: "romantic", label: "In a relationship", kind: "select", valueType: "string", options: YES_NO },
        { name: "freetime", label: "Free time after school", kind: "select", valueType: "int",
          options: scale5("very low", "very high") },
        { name: "goout", label: "Going out with friends", kind: "select", valueType: "int",
          options: scale5("very low", "very high") },
        { name: "Dalc", label: "Weekday alcohol use", kind: "select", valueType: "int",
          options: scale5("very low", "very high") },
        { name: "Walc", label: "Weekend alcohol use", kind: "select", valueType: "int",
          options: scale5("very low", "very high") }
      ]
    }
  ];

  const ALL_FIELDS = SECTIONS.reduce(function (list, s) { return list.concat(s.fields); }, []);

  // Example student (first row of student_data.csv) for quick testing.
  const SAMPLE = {
    school: "GP", sex: "F", age: 18, address: "U", famsize: "GT3", Pstatus: "A",
    Medu: 4, Fedu: 4, Mjob: "at_home", Fjob: "teacher", reason: "course", guardian: "mother",
    traveltime: 2, studytime: 2, failures: 0, schoolsup: "yes", famsup: "no", paid: "no",
    activities: "no", nursery: "yes", higher: "yes", internet: "no", romantic: "no",
    famrel: 4, freetime: 3, goout: 4, Dalc: 1, Walc: 1, health: 3, absences: 6
  };

  /* ---------- 3. Building the form ---------- */
  const form = document.getElementById("predict-form");
  const sectionsHost = document.getElementById("form-sections");
  const submitBtn = document.getElementById("submit-btn");
  const resultPanel = document.getElementById("result-panel");

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildField(f) {
    const wrap = el("div", { "class": "field", "data-field": f.name });
    wrap.appendChild(el("label", { "for": f.name }, f.label));

    let control;
    if (f.kind === "select") {
      control = el("select", { id: f.name, name: f.name, required: "" });
      const placeholder = el("option", { value: "", disabled: "", selected: "" }, "Select…");
      control.appendChild(placeholder);
      f.options.forEach(function (o) {
        control.appendChild(el("option", { value: String(o.value) }, o.label));
      });
    } else {
      control = el("input", {
        id: f.name, name: f.name, type: "number", inputmode: "numeric",
        step: "1", min: String(f.min), max: String(f.max), required: ""
      });
    }
    control.setAttribute("aria-describedby", "err-" + f.name);
    wrap.appendChild(control);

    if (f.help) wrap.appendChild(el("span", { "class": "help" }, f.help));
    wrap.appendChild(el("span", { "class": "error-msg", id: "err-" + f.name }));
    return wrap;
  }

  function buildForm() {
    SECTIONS.forEach(function (section) {
      const fieldset = el("fieldset", { "class": "section" });
      fieldset.appendChild(el("legend", {}, section.title));
      const grid = el("div", { "class": "section-grid" });
      section.fields.forEach(function (f) { grid.appendChild(buildField(f)); });
      fieldset.appendChild(grid);
      sectionsHost.appendChild(fieldset);
    });
  }

  /* ---------- 4. Validation ---------- */
  function setFieldError(name, message) {
    const wrap = form.querySelector('[data-field="' + name + '"]');
    if (!wrap) return;
    const control = wrap.querySelector("select, input");
    wrap.classList.toggle("has-error", Boolean(message));
    wrap.querySelector(".error-msg").textContent = message || "";
    if (message) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  }

  function clearAllErrors() {
    ALL_FIELDS.forEach(function (f) { setFieldError(f.name, ""); });
  }

  // Returns an error message for one field, or "" if it is fine.
  function checkField(f) {
    const raw = form.elements[f.name].value.trim();
    if (raw === "") return f.kind === "select" ? "Please choose an option." : "This field is required.";
    if (f.kind === "number") {
      const n = Number(raw);
      if (!Number.isInteger(n)) return "Enter a whole number.";
      if (n < f.min) return "Must be at least " + f.min + ".";
      if (n > f.max) return "Must be at most " + f.max + ".";
    }
    return "";
  }

  function validateForm() {
    let firstBad = null;
    ALL_FIELDS.forEach(function (f) {
      const message = checkField(f);
      setFieldError(f.name, message);
      if (message && !firstBad) firstBad = f.name;
    });
    return firstBad; // null means everything is valid
  }

  // Reads the form into the JSON object the API expects.
  function collectPayload() {
    const payload = {};
    ALL_FIELDS.forEach(function (f) {
      const raw = form.elements[f.name].value.trim();
      payload[f.name] = f.valueType === "int" ? parseInt(raw, 10) : raw;
    });
    return payload;
  }

  /* ---------- 5. Calling the API ---------- */
  // A small error type so the UI can show a title, a message and per-field problems.
  function ApiError(title, message, fieldErrors) {
    this.title = title;
    this.message = message;
    this.fieldErrors = fieldErrors || {};
  }

  // FastAPI sends 422 errors as { detail: [ { loc: ["body","age"], msg: "..." } ] }
  function parseValidationDetail(detail) {
    const fieldErrors = {};
    if (Array.isArray(detail)) {
      detail.forEach(function (item) {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : null;
        if (typeof field === "string") fieldErrors[field] = item.msg || "Invalid value.";
      });
    }
    return fieldErrors;
  }

  async function requestPrediction(payload) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(PREDICT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === "AbortError") {
        throw new ApiError("The server took too long",
          "No answer after " + REQUEST_TIMEOUT_MS / 1000 + " seconds. Check that the backend is running and try again.");
      }
      // fetch() rejects with a TypeError for network failures and CORS blocks.
      throw new ApiError("Can't reach the API",
        "Could not connect to " + API_BASE_URL + ".\n" +
        "• Is the FastAPI server running?\n" +
        "• Is API_BASE_URL in config.js correct?\n" +
        "• If the server is running, the browser may be blocking the request (CORS). See the setup notes.");
    } finally {
      clearTimeout(timer);
    }

    let body = null;
    try { body = await response.json(); } catch (e) { /* response had no JSON body */ }

    if (response.status === 422) {
      throw new ApiError("The server rejected some inputs",
        "Please fix the highlighted fields and try again.",
        parseValidationDetail(body && body.detail));
    }
    if (!response.ok) {
      const serverMsg = body && typeof body.detail === "string" ? body.detail : "";
      throw new ApiError("Server error (" + response.status + ")",
        serverMsg || "The backend failed while making the prediction. Check the terminal running uvicorn for details.");
    }

    const value = body && body.prediction;
    if (typeof value !== "number" || !isFinite(value)) {
      throw new ApiError("Unexpected response",
        'The API did not return a numeric "prediction" value.');
    }
    return value;
  }

  /* ---------- 6. Showing results / errors ---------- */
  function setState(state) {
    resultPanel.dataset.state = state;
    // On narrow screens the result sits below the form, so bring it into view.
    if (state !== "idle" && window.matchMedia("(max-width: 900px)").matches) {
      resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function bandFor(score) {
    let chosen = GRADE_BANDS[0];
    GRADE_BANDS.forEach(function (b) { if (score >= b.min) chosen = b; });
    return chosen;
  }

  function showSuccess(score) {
    const band = bandFor(score);
    const clamped = Math.min(Math.max(score, 0), MAX_GRADE);

    document.getElementById("score-value").textContent = score.toFixed(1);
    document.getElementById("band-label").textContent = band.label;
    document.getElementById("band-note").textContent = band.note;
    document.getElementById("ruler-marker").style.left = (clamped / MAX_GRADE) * 100 + "%";
    resultPanel.dataset.tone = band.tone;
    setState("success");
  }

  function showError(err) {
    document.getElementById("error-title").textContent = err.title || "Something went wrong";
    document.getElementById("error-text").textContent =
      err.message || "An unexpected error occurred.";
    setState("error");
  }

  /* ---------- 7. Wiring up the buttons ---------- */
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearAllErrors();

    const firstBad = validateForm();
    if (firstBad) {
      showError(new ApiError("Some inputs need attention",
        "Please complete the highlighted fields."));
      form.elements[firstBad].focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Predicting…";
    setState("loading");

    try {
      const score = await requestPrediction(collectPayload());
      showSuccess(score);
    } catch (err) {
      const apiErr = err instanceof ApiError
        ? err
        : new ApiError("Something went wrong", String(err && err.message ? err.message : err));
      Object.keys(apiErr.fieldErrors).forEach(function (name) {
        setFieldError(name, apiErr.fieldErrors[name]);
      });
      showError(apiErr);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Predict final grade";
    }
  });

  // Typing or choosing a value clears that field's error message.
  form.addEventListener("input", function (event) {
    if (event.target.name) setFieldError(event.target.name, "");
  });

  document.getElementById("sample-btn").addEventListener("click", function () {
    ALL_FIELDS.forEach(function (f) { form.elements[f.name].value = String(SAMPLE[f.name]); });
    clearAllErrors();
  });

  document.getElementById("reset-btn").addEventListener("click", function () {
    form.reset();
    clearAllErrors();
    delete resultPanel.dataset.tone;
    resultPanel.dataset.state = "idle";
  });

  // Start-up
  document.getElementById("api-url-label").textContent = API_BASE_URL;
  buildForm();
})();
