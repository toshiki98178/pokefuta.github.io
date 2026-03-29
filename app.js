const ATTRIBUTES = [
  "超速","極速","超技","極技",
  "超知","極知","超力","極力",
  "超体","極体"
];

const STORAGE_KEY = "dokkan_characters";

let characters = [];

// 起動時
window.onload = () => {
  loadAttributes();
  loadAttributeFilter();
  loadFromLocalStorage();
  render();
};

// 属性セット
function loadAttributes() {
  const select = document.getElementById("attribute");
  ATTRIBUTES.forEach(attr => {
    const option = document.createElement("option");
    option.value = attr;
    option.textContent = attr;
    select.appendChild(option);
  });
}

// localStorageから読み込み
function loadFromLocalStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  characters = data ? JSON.parse(data) : [];
}

// 保存
function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

// 表示
function render() {
  const list = document.getElementById("character-list");
  list.innerHTML = "";

  const filterDupe = document.getElementById("filter-dupe").value;
  const selectedAttrs = getSelectedAttributes();

  let filtered = characters.filter(c => {
    const matchDupe = !filterDupe || c.dupe == filterDupe;
    const matchAttr = selectedAttrs.length === 0 || selectedAttrs.includes(c.attribute);

    return matchDupe && matchAttr;
  });

  filtered.forEach(c => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${c.image}">
      
      <input value="${c.name}" onchange="updateField(${c.id}, 'name', this.value)">

      <select onchange="updateField(${c.id}, 'attribute', this.value)">
        ${ATTRIBUTES.map(a => 
          `<option value="${a}" ${a === c.attribute ? "selected" : ""}>${a}</option>`
        ).join("")}
      </select>

      <div class="dupe-control">
        <button onclick="changeDupe(${c.id}, -1)">-</button>
        <span>${c.dupe}凸</span>
        <button onclick="changeDupe(${c.id}, 1)">+</button>
      </div>

      <input value="${c.tags.join(",")}" 
        onchange="updateTags(${c.id}, this.value)">

      <button onclick="deleteCharacter(${c.id})">削除</button>
    `;

    list.appendChild(div);
  });
}

// 追加
async function addCharacter() {
  const name = document.getElementById("name").value;
  const file = document.getElementById("image").files[0];
  const dupe = parseInt(document.getElementById("dupe").value);
  const attribute = document.getElementById("attribute").value;
  const tags = document.getElementById("tags").value
    .split(",")
    .map(t => t.trim())
    .filter(t => t !== "")
    .slice(0, 5);

  if (!name || !file) {
    alert("名前と画像は必須");
    return;
  }

  const image = await toBase64(file);

  const newChar = {
    id: Date.now(),
    name,
    image,
    dupe,
    attribute,
    tags
  };

  characters.push(newChar);
  saveToLocalStorage();
  render();

  // 入力リセット
  document.getElementById("name").value = "";
  document.getElementById("image").value = "";
  document.getElementById("tags").value = "";
}

// 削除
function deleteCharacter(id) {
  characters = characters.filter(c => c.id !== id);
  saveToLocalStorage();
  render();
}

function changeDupe(id, delta) {
  const char = characters.find(c => c.id === id);
  if (!char) return;

  char.dupe += delta;

  // 0〜4に制限
  if (char.dupe < 0) char.dupe = 0;
  if (char.dupe > 4) char.dupe = 4;

  saveToLocalStorage();
  render();
}

function loadAttributeFilter() {
  const container = document.getElementById("filter-attributes");

  ATTRIBUTES.forEach(attr => {
    const label = document.createElement("label");

    label.innerHTML = `
      <input type="checkbox" value="${attr}" onchange="render()">
      ${attr}
    `;

    container.appendChild(label);
  });
}

function getSelectedAttributes() {
  const checkboxes = document.querySelectorAll("#filter-attributes input:checked");
  return Array.from(checkboxes).map(cb => cb.value);
}

function updateTags(id, value) {
  const char = characters.find(c => c.id === id);
  if (!char) return;

  char.tags = value
    .split(",")
    .map(t => t.trim())
    .filter(t => t !== "")
    .slice(0, 5);

  saveToLocalStorage();
}

function updateField(id, field, value) {
  const char = characters.find(c => c.id === id);
  if (!char) return;

  char[field] = value;

  saveToLocalStorage();
}

// base64変換
function toBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}
