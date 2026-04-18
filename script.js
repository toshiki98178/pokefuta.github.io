const regions = {
  "北海道・東北": ["北海道","青森","岩手","宮城","秋田","山形","福島"],
  "関東": ["東京","神奈川","埼玉","千葉","茨城","栃木","群馬"],
  "中部": ["新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知"],
  "近畿": ["大阪","京都","兵庫","奈良","滋賀","和歌山","三重"],
  "中国・四国": ["鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知"],
  "九州・沖縄": ["福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄"]
};

const state = {
  level: 'region',
  region: null,
  prefecture: null,
  editIndex: null,
  formMode: 'add'
};

let pendingPhotoData = '';

const listEl = document.getElementById('list');
const backBtn = document.getElementById('backBtn');
const addBtn = document.getElementById('addBtn');
const formPanel = document.getElementById('formPanel');
const summaryEl = document.getElementById('summary');
const progressEl = document.getElementById('progress');
const formTitle = document.getElementById('formTitle');
const futaForm = document.getElementById('futaForm');
const nameInput = document.getElementById('name');
const dateInput = document.getElementById('date');
const photoInput = document.getElementById('photo');
const previewContainer = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const cancelBtn = document.getElementById('cancelBtn');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const largeImage = document.getElementById('largeImage');
const imagePreviewOverlay = document.getElementById('imagePreviewOverlay');

function getData() {
  return JSON.parse(localStorage.getItem('poke') || '{}');
}

function saveData(data) {
  localStorage.setItem('poke', JSON.stringify(data));
}

function countTotals(data) {
  let total = 0;
  let visited = 0;

  Object.values(data).forEach(items => {
    items.forEach(item => {
      total += 1;
      if (item.date) {
        visited += 1;
      }
    });
  });

  return { total, visited };
}

function countRegion(region) {
  const data = getData();
  let total = 0;
  let visited = 0;

  regions[region].forEach(pref => {
    (data[pref] || []).forEach(item => {
      total += 1;
      if (item.date) {
        visited += 1;
      }
    });
  });

  return { total, visited };
}

function countPref(prefecture) {
  const items = getData()[prefecture] || [];
  const visited = items.filter(item => item.date).length;
  return { total: items.length, visited };
}

function formatPercent(visited, total) {
  return total === 0 ? '0%' : `${Math.round((visited / total) * 100)}%`;
}

function updateProgress() {
  const totals = countTotals(getData());
  let text = `全国 ${totals.visited}/${totals.total} (${formatPercent(totals.visited, totals.total)})`;

  if (state.level === 'pref' && state.region) {
    const region = countRegion(state.region);
    text += ` | ${state.region} ${region.visited}/${region.total} (${formatPercent(region.visited, region.total)})`;
  }

  if (state.level === 'futa' && state.prefecture) {
    const prefecture = countPref(state.prefecture);
    text += ` | ${state.prefecture} ${prefecture.visited}/${prefecture.total} (${formatPercent(prefecture.visited, prefecture.total)})`;
  }

  progressEl.textContent = text;
}

function setSummary(text) {
  summaryEl.textContent = text;
}

function openForm(mode, index = null) {
  state.formMode = mode;
  state.editIndex = index;
  formPanel.classList.remove('hidden');
  document.body.classList.add('no-scroll');
  addBtn.classList.add('hidden');
  backBtn.disabled = true;
  formTitle.textContent = mode === 'edit' ? 'ポケふたを編集' : 'ポケふたを登録';

  if (mode === 'edit') {
    const items = getData()[state.prefecture] || [];
    const item = items[index];
    if (!item) {
      return;
    }

    nameInput.value = item.name;
    dateInput.value = item.date || '';
    pendingPhotoData = item.photo || '';

    if (pendingPhotoData) {
      previewImage.src = pendingPhotoData;
      previewContainer.classList.remove('hidden');
    } else {
      previewImage.src = '';
      previewContainer.classList.add('hidden');
    }
  } else {
    futaForm.reset();
    pendingPhotoData = '';
    previewImage.src = '';
    previewContainer.classList.add('hidden');
  }
}

function closeForm() {
  formPanel.classList.add('hidden');
  document.body.classList.remove('no-scroll');
  backBtn.disabled = false;
  if (state.level === 'futa') {
    addBtn.classList.remove('hidden');
  }
}

function openImagePreview(src, alt) {
  largeImage.src = src;
  largeImage.alt = alt;
  imagePreviewModal.classList.remove('hidden');
  document.body.classList.add('no-scroll');
}

function closeImagePreview() {
  imagePreviewModal.classList.add('hidden');
  document.body.classList.remove('no-scroll');
}

function buildListItem(text, detail, extraClass = '') {
  const li = document.createElement('li');
  li.className = `list-item ${extraClass}`;

  const title = document.createElement('div');
  title.className = 'item-title';
  title.textContent = text;

  const description = document.createElement('div');
  description.className = 'item-detail';
  description.textContent = detail;

  li.appendChild(title);
  li.appendChild(description);
  return li;
}

function render() {
  updateProgress();
  listEl.innerHTML = '';
  formPanel.classList.add('hidden');
  addBtn.classList.toggle('hidden', state.level !== 'futa');
  backBtn.classList.toggle('hidden', state.level === 'region');
  backBtn.disabled = false;

  if (state.level === 'region') {
    setSummary('地域を選択してください');
    Object.keys(regions).forEach(region => {
      const counts = countRegion(region);
      const li = buildListItem(region, `${counts.visited}/${counts.total} 訪問 (${formatPercent(counts.visited, counts.total)})`);
      li.addEventListener('click', () => {
        state.level = 'pref';
        state.region = region;
        render();
      });
      listEl.appendChild(li);
    });
    return;
  }

  if (state.level === 'pref') {
    setSummary(`${state.region} の都道府県を選択してください`);
    regions[state.region].forEach(pref => {
      const counts = countPref(pref);
      const li = buildListItem(pref, `${counts.visited}/${counts.total} 訪問 (${formatPercent(counts.visited, counts.total)})`);
      li.addEventListener('click', () => {
        state.level = 'futa';
        state.prefecture = pref;
        render();
      });
      listEl.appendChild(li);
    });
    return;
  }

  if (state.level === 'futa') {
    setSummary(`${state.prefecture} のポケふた一覧`);
    const items = getData()[state.prefecture] || [];

    if (items.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'まだ登録されたポケふたはありません。新しいポケふたを追加してください。';
      listEl.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'futa-item';

      if (item.photo) {
        const image = document.createElement('img');
        image.src = item.photo;
        image.alt = item.name;
        image.className = 'item-image';
        image.addEventListener('click', () => openImagePreview(item.photo, item.name));
        li.appendChild(image);
      }

      const content = document.createElement('div');
      content.className = 'item-content';

      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = item.name;

      const status = document.createElement('div');
      status.className = 'item-status';
      status.textContent = item.date ? `訪問済み - ${item.date}` : '未訪問';

      content.appendChild(title);
      content.appendChild(status);
      li.appendChild(content);

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const editButton = document.createElement('button');
      editButton.textContent = '編集';
      editButton.type = 'button';
      editButton.className = 'action-button';
      editButton.addEventListener('click', () => openForm('edit', index));

      const deleteButton = document.createElement('button');
      deleteButton.textContent = '削除';
      deleteButton.type = 'button';
      deleteButton.className = 'action-button secondary';
      deleteButton.addEventListener('click', () => {
        if (confirm('このポケふたを削除しますか？')) {
          const data = getData();
          data[state.prefecture].splice(index, 1);
          saveData(data);
          render();
        }
      });

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      li.appendChild(actions);
      listEl.appendChild(li);
    });
  }
}

function saveForm() {
  const name = nameInput.value.trim();
  const date = dateInput.value;
  const photo = pendingPhotoData;

  if (!name) {
    alert('名前を入力してください。');
    return;
  }

  const data = getData();
  const items = data[state.prefecture] || [];
  const record = { name, date, photo };

  if (state.formMode === 'edit' && state.editIndex !== null) {
    items[state.editIndex] = record;
  } else {
    items.push(record);
  }

  data[state.prefecture] = items;
  saveData(data);
  closeForm();
  render();
}

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) {
    pendingPhotoData = '';
    previewContainer.classList.add('hidden');
    previewImage.src = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    pendingPhotoData = reader.result;
    previewImage.src = pendingPhotoData;
    previewContainer.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
});

futaForm.addEventListener('submit', event => {
  event.preventDefault();
  saveForm();
});

cancelBtn.addEventListener('click', () => {
  closeForm();
});

imagePreviewOverlay.addEventListener('click', () => {
  closeImagePreview();
});

addBtn.addEventListener('click', () => {
  openForm('add');
});

backBtn.addEventListener('click', () => {
  if (state.level === 'futa') {
    state.level = 'pref';
  } else if (state.level === 'pref') {
    state.level = 'region';
  }
  render();
});

window.addEventListener('DOMContentLoaded', () => {
  render();
});