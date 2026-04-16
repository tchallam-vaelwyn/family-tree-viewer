// ------------------ GEDCOM PARSER ------------------
function parseGedcom(text) {
  const lines = text.split(/\r?\n/);

  const individuals = {};
  const families = {};

  let currentIndi = null;
  let currentFam = null;
  let context = null;

  for (let line of lines) {
    if (!line.trim()) continue;

    const parts = line.trim().split(" ");
    const level = parts[0];
    const tag = parts[1];
    const rest = parts.slice(2).join(" ");

    // INDIVIDUAL START
    if (level === "0" && parts.length >= 3 && parts[2].toUpperCase() === "INDI") {
      currentIndi = tag;
      currentFam = null;
      individuals[currentIndi] = {
        id: currentIndi,
        name: "",
        birth: "",
        death: "",
        famc: [],
        fams: [],
        raw: []
      };
      continue;
    }

    // FAMILY START
    if (level === "0" && parts.length >= 3 && parts[2].toUpperCase() === "FAM") {
      currentFam = tag;
      currentIndi = null;
      families[currentFam] = {
        id: currentFam,
        husband: null,
        wife: null,
        children: [],
        raw: []
      };
      continue;
    }

    // Inside INDIVIDUAL
    if (currentIndi) {
      const p = individuals[currentIndi];
      p.raw.push(line);

      if (level === "1") {
        context = null;
        if (tag === "NAME") p.name = rest;
        if (tag === "BIRT") context = "BIRT";
        if (tag === "DEAT") context = "DEAT";
        if (tag === "FAMC") p.famc.push(rest);
        if (tag === "FAMS") p.fams.push(rest);
      }

      if (level === "2" && tag === "DATE") {
        if (context === "BIRT") p.birth = rest;
        if (context === "DEAT") p.death = rest;
      }
    }

    // Inside FAMILY
    if (currentFam) {
      const f = families[currentFam];
      f.raw.push(line);

      if (level === "1") {
        if (tag === "HUSB") f.husband = rest;
        if (tag === "WIFE") f.wife = rest;
        if (tag === "CHIL") f.children.push(rest);
      }
    }
  }

  return { individuals, families };
}

// ------------------ UI LOGIC ------------------
const input = document.getElementById('gedInput');
const peopleList = document.getElementById('peopleList');
const details = document.getElementById('details');
const searchBox = document.getElementById('searchBox');

let IND = {};
let FAM = {};

input.addEventListener('change', () => {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const parsed = parseGedcom(text);
    IND = parsed.individuals;
    FAM = parsed.families;
    renderFilteredList();
    populateRelationshipDropdowns();
details.innerHTML = "Select a person to view details.";
    details.innerHTML = "Select a person to view details.";
  };
  reader.readAsText(file);
});

searchBox.addEventListener("input", renderFilteredList);

function renderFilteredList() {
  const query = searchBox.value.toLowerCase();
  peopleList.innerHTML = "";

  Object.keys(IND).forEach(id => {
    const p = IND[id];
    const name = (p.name || "").toLowerCase();

    if (name.includes(query)) {
      const div = document.createElement("div");
      div.textContent = p.name || id;
      div.onclick = () => showDetails(id);
      peopleList.appendChild(div);
    }
  });
}

function linkTo(id) {
  return `<span class="link" onclick="showDetails('${id}')">${IND[id]?.name || id}</span>`;
}

function showDetails(id) {
  const p = IND[id];
  if (!p) return;

  let father = "Unknown";
  let mother = "Unknown";
  let spouses = [];
  let children = [];

  // FAMC = child in family
  p.famc.forEach(famId => {
    const fam = FAM[famId];
    if (!fam) return;
    if (fam.husband) father = linkTo(fam.husband);
    if (fam.wife) mother = linkTo(fam.wife);
  });

  // FAMS = spouse in family
  p.fams.forEach(famId => {
    const fam = FAM[famId];
    if (!fam) return;

    if (fam.husband === id && fam.wife) spouses.push(linkTo(fam.wife));
    if (fam.wife === id && fam.husband) spouses.push(linkTo(fam.husband));

    fam.children.forEach(c => children.push(linkTo(c)));
  });

  details.innerHTML = `
    <strong>${p.name || id}</strong><br>
    <b>Born:</b> ${p.birth || "Unknown"}<br>
    <b>Died:</b> ${p.death || "Unknown"}<br><br>

    <b>Father:</b> ${father}<br>
    <b>Mother:</b> ${mother}<br><br>

    <b>Spouses:</b><br>
    ${spouses.length ? spouses.join("<br>") : "None"}<br><br>

    <b>Children:</b><br>
    ${children.length ? children.join("<br>") : "None"}<br><br>

    <b>Raw GEDCOM:</b>
    <pre>${p.raw.join("\n")}</pre>
  `;
}
