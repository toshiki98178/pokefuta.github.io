const ATTRIBUTES = [
  "超速","極速","超技","極技",
  "超知","極知","超力","極力",
  "超体","極体"
];

// 属性の並び順
const ATTRIBUTE_ORDER = [
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
  loadTagFilter();
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
  const selectedTags = getSelectedTags();
  const sortBy = document.getElementById("sort-by").value;

  let filtered = characters.filter(c => {
    const matchDupe = !filterDupe || c.dupe == filterDupe;
    const matchAttr = selectedAttrs.length === 0 || selectedAttrs.includes(c.attribute);
    const matchTag = selectedTags.length === 0 || selectedTags.some(tag => c.tags.includes(tag));

    return matchDupe && matchAttr && matchTag;
  });

  // 並び替え処理
  if (sortBy) {
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dupe-desc':
          return b.dupe - a.dupe;
        case 'dupe-asc':
          return a.dupe - b.dupe;
        case 'name-asc':
          return a.name.localeCompare(b.name, 'ja');
        case 'attribute-asc':
          const aIndex = ATTRIBUTE_ORDER.indexOf(a.attribute);
          const bIndex = ATTRIBUTE_ORDER.indexOf(b.attribute);
          return aIndex - bIndex;
        default:
          return 0;
      }
    });
  }

  filtered.forEach(c => {
    const div = document.createElement("div");
    div.className = "list-item";

    if (c.editing) {
      // 編集モード
      div.innerHTML = `
        <div class="character-main-row">
          <div class="edit-image-container">
            <img src="${c.image}" class="character-image">
            <input type="file" id="edit-image-${c.id}" accept="image/*">
          </div>
          <div class="edit-info">
            <input type="text" value="${c.name}" id="edit-name-${c.id}" class="edit-name">
            <input type="text" value="${c.tags.join(", ")}" id="edit-tags-${c.id}" class="edit-tags">
          </div>
          <div class="edit-stats">
            <span class="character-attribute attribute-${c.attribute}">${c.attribute}</span>
            <select id="edit-dupe-${c.id}" class="edit-dupe">
              <option value="0" ${c.dupe === 0 ? "selected" : ""}>0凸</option>
              <option value="1" ${c.dupe === 1 ? "selected" : ""}>1凸</option>
              <option value="2" ${c.dupe === 2 ? "selected" : ""}>2凸</option>
              <option value="3" ${c.dupe === 3 ? "selected" : ""}>3凸</option>
              <option value="4" ${c.dupe === 4 ? "selected" : ""}>4凸</option>
            </select>
          </div>
          <div class="edit-buttons">
            <button onclick="saveCharacter(${c.id})" class="save-btn">保存</button>
            <button onclick="cancelEdit(${c.id})" class="cancel-btn">キャンセル</button>
          </div>
        </div>
      `;
    } else {
      // 通常モード
      div.innerHTML = `
        <div class="character-main-row">
          <img src="${c.image}" class="character-image">
          <div class="character-info">
            <span class="character-name">${c.name}</span>
            <span class="character-tags">${c.tags.join(", ")}</span>
          </div>
          <div class="character-stats">
            <span class="character-attribute attribute-${c.attribute}">${c.attribute}</span>
            <span class="character-dupe">${c.dupe}凸</span>
          </div>
          <div class="action-buttons">
            <button onclick="editCharacter(${c.id})" class="edit-btn">編集</button>
            <button onclick="deleteCharacter(${c.id})" class="delete-btn">削除</button>
          </div>
        </div>
      `;
    }

    list.appendChild(div);
  });
}


// 削除
function deleteCharacter(id) {
  characters = characters.filter(c => c.id !== id);
  saveToLocalStorage();
  loadTagFilter(); // タグフィルタを再読み込み
  render();
}


function loadAttributeFilter() {
  const container = document.getElementById("filter-attributes");

  // タイトルを追加
  // const title = document.createElement("div");
  // title.textContent = "属性絞り込み";
  // title.style.fontWeight = "600";
  // title.style.color = "#1c1c1e";
  // title.style.marginBottom = "8px";
  // title.style.fontSize = "16px";
  // container.appendChild(title);

  ATTRIBUTES.forEach(attr => {
    const label = document.createElement("label");

    label.innerHTML = `
      <input type="checkbox" value="${attr}" onchange="render()">
      ${attr}
    `;

    container.appendChild(label);
  });
}

// タグフィルタを読み込み
function loadTagFilter() {
  const container = document.getElementById("filter-tags");

  // 既存のタグフィルタをクリア
  container.innerHTML = "";

  // すべてのタグを収集
  const allTags = getAllTags();

  if (allTags.length > 0) {
    // const title = document.createElement("div");
    // title.textContent = "タグ絞り込み";
    // title.style.fontWeight = "600";
    // title.style.color = "#1c1c1e";
    // title.style.marginTop = "15px";
    // title.style.marginBottom = "8px";
    // title.style.fontSize = "16px";
    // container.appendChild(title);

    allTags.forEach(tag => {
      const label = document.createElement("label");

      label.innerHTML = `
        <input type="checkbox" value="${tag}" onchange="render()">
        ${tag}
      `;

      container.appendChild(label);
    });
  }
}

// すべてのタグを収集（重複なし、あいうえお順）
function getAllTags() {
  const tagSet = new Set();

  characters.forEach(char => {
    char.tags.forEach(tag => {
      if (tag.trim()) {
        tagSet.add(tag.trim());
      }
    });
  });

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja'));
}

function getSelectedAttributes() {
  const checkboxes = document.querySelectorAll("#filter-attributes input:checked");
  return Array.from(checkboxes).map(cb => cb.value);
}

function getSelectedTags() {
  const checkboxes = document.querySelectorAll("#filter-tags input:checked");
  return Array.from(checkboxes).map(cb => cb.value);
}


// 編集モード開始
function editCharacter(id) {
  const char = characters.find(c => c.id === id);
  if (!char) return;

  // 編集前の値をバックアップ
  char.originalData = {
    name: char.name,
    image: char.image,
    dupe: char.dupe,
    tags: [...char.tags]
  };

  char.editing = true;
  render();
}

// 編集保存
async function saveCharacter(id) {
  const char = characters.find(c => c.id === id);
  if (!char) return;

  const nameInput = document.getElementById(`edit-name-${id}`);
  const imageInput = document.getElementById(`edit-image-${id}`);
  const dupeSelect = document.getElementById(`edit-dupe-${id}`);
  const tagsInput = document.getElementById(`edit-tags-${id}`);

  // 名前更新
  char.name = nameInput.value.trim() || char.name;

  // 画像更新（新しい画像が選択された場合）
  if (imageInput.files[0]) {
    char.image = await toBase64(imageInput.files[0]);
  }

  // 凸数更新
  char.dupe = parseInt(dupeSelect.value);

  // タグ更新
  char.tags = tagsInput.value
    .split(",")
    .map(t => t.trim())
    .filter(t => t !== "")
    .slice(0, 5);

  // 編集モード終了
  char.editing = false;
  delete char.originalData;

  saveToLocalStorage();
  loadTagFilter(); // タグフィルタを再読み込み
  render();
}

// 編集キャンセル
function cancelEdit(id) {
  const char = characters.find(c => c.id === id);
  if (!char) return;

  // 元の値に戻す
  if (char.originalData) {
    char.name = char.originalData.name;
    char.image = char.originalData.image;
    char.dupe = char.originalData.dupe;
    char.tags = char.originalData.tags;
  }

  // 編集モード終了
  char.editing = false;
  delete char.originalData;

  render();
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
    alert("名前と画像は必須です");
    return;
  }

  if (!attribute) {
    alert("属性を選択してください");
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
  loadTagFilter(); // タグフィルタを再読み込み
  render();

  // 登録フォームを閉じる
  toggleRegistration();
}

// base64変換
function toBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// 登録フォームの表示/非表示を切り替え
function toggleRegistration() {
  const section = document.getElementById("registration-section");
  const btn = document.getElementById("register-btn");

  if (section.style.display === "none") {
    // 表示する
    section.style.display = "block";
    btn.textContent = "−";
    btn.style.transform = "translateY(-50%) rotate(180deg)";
  } else {
    // 非表示にする
    section.style.display = "none";
    btn.textContent = "＋";
    btn.style.transform = "translateY(-50%) rotate(0deg)";

    // フォームをリセット
    document.getElementById("name").value = "";
    document.getElementById("image").value = "";
    document.getElementById("dupe").value = "0";
    document.getElementById("attribute").value = "";
    document.getElementById("tags").value = "";
  }
}
