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
  formMode: 'add',
  viewMode: 'list'
};

let pendingPhotoData = '';

const listEl = document.getElementById('list');
const backBtn = document.getElementById('backBtn');
const addBtn = document.getElementById('addBtn');
const viewModeBtn = document.getElementById('viewModeBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const formPanel = document.getElementById('formPanel');
const summaryEl = document.getElementById('summary');
const progressEl = document.getElementById('progress');
const formTitle = document.getElementById('formTitle');
const futaForm = document.getElementById('futaForm');
const nameInput = document.getElementById('name');
const dateInput = document.getElementById('date');
const cityInput = document.getElementById('city');
const photoInput = document.getElementById('photo');
const previewContainer = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const cancelBtn = document.getElementById('cancelBtn');
const imagePreviewModal = document.getElementById('imagePreviewModal');
const largeImage = document.getElementById('largeImage');
const imagePreviewOverlay = document.getElementById('imagePreviewOverlay');
const cropModal = document.getElementById('cropModal');
const cropCanvas = document.getElementById('cropCanvas');
const cropSizeSlider = document.getElementById('cropSizeSlider');
const cropApplyBtn = document.getElementById('cropApplyBtn');
const cropCancelBtn = document.getElementById('cropCancelBtn');

let originalImage = new Image();
let cropState = {
  x: 0,
  y: 0,
  size: 0,
  displayWidth: 0,
  displayHeight: 0,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0
};

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
    cityInput.value = item.city || '';
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

function clampCrop() {
  const maxX = cropState.displayWidth - cropState.size;
  const maxY = cropState.displayHeight - cropState.size;
  cropState.x = Math.min(Math.max(cropState.x, 0), Math.max(maxX, 0));
  cropState.y = Math.min(Math.max(cropState.y, 0), Math.max(maxY, 0));
}

function drawCropCanvas() {
  const ctx = cropCanvas.getContext('2d');
  ctx.clearRect(0, 0, cropState.displayWidth, cropState.displayHeight);
  ctx.drawImage(originalImage, 0, 0, cropState.displayWidth, cropState.displayHeight);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, cropState.displayWidth, cropState.displayHeight);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(cropState.x, cropState.y, cropState.size, cropState.size);
}

function openCropModal() {
  cropModal.classList.remove('hidden');
  document.body.classList.add('no-scroll');

  const maxWidth = Math.min(window.innerWidth - 64, originalImage.width, 700);
  const scale = maxWidth / originalImage.width;
  cropState.displayWidth = Math.round(originalImage.width * scale);
  cropState.displayHeight = Math.round(originalImage.height * scale);
  cropState.size = Math.round(Math.min(cropState.displayWidth, cropState.displayHeight) * 0.8);
  cropState.x = Math.round((cropState.displayWidth - cropState.size) / 2);
  cropState.y = Math.round((cropState.displayHeight - cropState.size) / 2);

  cropCanvas.width = cropState.displayWidth;
  cropCanvas.height = cropState.displayHeight;
  cropSizeSlider.value = Math.round((cropState.size / Math.min(cropState.displayWidth, cropState.displayHeight)) * 100);
  drawCropCanvas();
}

function closeCropModal() {
  cropModal.classList.add('hidden');
  document.body.classList.remove('no-scroll');
}

function applyCrop() {
  const ratio = originalImage.width / cropState.displayWidth;
  const sx = Math.round(cropState.x * ratio);
  const sy = Math.round(cropState.y * ratio);
  const size = Math.round(cropState.size * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(originalImage, sx, sy, size, size, 0, 0, size, size);

  pendingPhotoData = canvas.toDataURL('image/jpeg', 0.92);
  previewImage.src = pendingPhotoData;
  previewContainer.classList.remove('hidden');
  closeCropModal();
}

function setCropSelectionSize(value) {
  const minEdge = Math.min(cropState.displayWidth, cropState.displayHeight);
  const newSize = Math.max(40, Math.round((minEdge * value) / 100));
  const centerX = cropState.x + cropState.size / 2;
  const centerY = cropState.y + cropState.size / 2;
  cropState.size = newSize;
  cropState.x = Math.round(centerX - newSize / 2);
  cropState.y = Math.round(centerY - newSize / 2);
  clampCrop();
  drawCropCanvas();
}

function isPointerInCropArea(clientX, clientY) {
  const rect = cropCanvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return x >= cropState.x && x <= cropState.x + cropState.size && y >= cropState.y && y <= cropState.y + cropState.size;
}

cropCanvas.addEventListener('pointerdown', event => {
  if (!isPointerInCropArea(event.clientX, event.clientY)) {
    return;
  }
  event.preventDefault();
  const rect = cropCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  cropState.dragging = true;
  cropState.dragOffsetX = x - cropState.x;
  cropState.dragOffsetY = y - cropState.y;
});

window.addEventListener('pointermove', event => {
  if (!cropState.dragging) {
    return;
  }
  const rect = cropCanvas.getBoundingClientRect();
  cropState.x = event.clientX - rect.left - cropState.dragOffsetX;
  cropState.y = event.clientY - rect.top - cropState.dragOffsetY;
  clampCrop();
  drawCropCanvas();
});

window.addEventListener('pointerup', () => {
  cropState.dragging = false;
});

cropSizeSlider.addEventListener('input', () => {
  setCropSelectionSize(cropSizeSlider.value);
});

cropApplyBtn.addEventListener('click', applyCrop);
cropCancelBtn.addEventListener('click', () => {
  pendingPhotoData = '';
  photoInput.value = '';
  previewImage.src = '';
  previewContainer.classList.add('hidden');
  closeCropModal();
});

function exportData() {
  const data = getData();
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `pokefuta-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  const file = importFile.files[0];
  if (!file) {
    alert('ファイルを選択してください。');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);

      // データの検証
      if (typeof importedData !== 'object' || importedData === null) {
        throw new Error('無効なJSON形式です。');
      }

      // 現在のデータとマージするか確認
      const currentData = getData();
      const hasCurrentData = Object.keys(currentData).length > 0;

      let finalData = importedData;

      if (hasCurrentData) {
        const choice = confirm(
          '現在のデータが存在します。上書きしますか？\n\n' +
          '「OK」: インポートデータを上書き\n' +
          '「キャンセル」: キャンセル'
        );
        if (!choice) {
          return;
        }
      }

      saveData(finalData);
      alert('データをインポートしました。');
      render();

    } catch (error) {
      alert('ファイルの読み込みに失敗しました。JSON形式のファイルを選択してください。\n\nエラー: ' + error.message);
    }
  };

  reader.readAsText(file);
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
  viewModeBtn.classList.toggle('hidden', state.level !== 'futa');
  viewModeBtn.textContent = state.viewMode === 'gallery' ? '📄 リスト' : '📷 ギャラリー';
  viewModeBtn.classList.toggle('view-mode-btn', true);
  backBtn.classList.toggle('hidden', state.level === 'region');
  backBtn.disabled = false;
  listEl.classList.toggle('gallery-grid', state.level === 'futa' && state.viewMode === 'gallery');
  listEl.classList.toggle('list', !(state.level === 'futa' && state.viewMode === 'gallery'));

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

    if (state.viewMode === 'gallery') {
      const photoItems = items
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.item.photo);

      if (photoItems.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'empty-state';
        empty.textContent = '写真付きのポケふたがありません。リスト表示に戻して確認してください。';
        listEl.appendChild(empty);
        return;
      }

      photoItems.forEach(({ item, index }) => {
        const li = document.createElement('li');
        li.className = 'gallery-item';

        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumb';
        const image = document.createElement('img');
        image.src = item.photo;
        image.alt = item.name;
        thumb.appendChild(image);
        thumb.addEventListener('click', () => openImagePreview(item.photo, item.name));
        li.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'gallery-info';

        const title = document.createElement('div');
        title.className = 'gallery-title';
        title.textContent = item.name;

        const status = document.createElement('div');
        status.className = 'gallery-status';
        const cityText = item.city ? ` - ${item.city}` : '';
        status.textContent = item.date ? `${item.date}${cityText}` : '未訪問';

        info.appendChild(title);
        info.appendChild(status);
        li.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'gallery-actions';

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
      } else {
        const noImage = document.createElement('div');
        noImage.className = 'item-image no-image';
        noImage.textContent = 'No Image';
        li.appendChild(noImage);
      }

      const content = document.createElement('div');
      content.className = 'item-content';

      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = item.name;

      const status = document.createElement('div');
      status.className = 'item-status';
      const cityText = item.city ? ` - ${item.city}` : '';
      status.textContent = item.date ? `${item.date}${cityText}` : '未訪問';

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
  const city = cityInput.value.trim();
  const photo = pendingPhotoData;

  if (!name) {
    alert('名前を入力してください。');
    return;
  }

  const data = getData();
  const items = data[state.prefecture] || [];
  const record = { name, date, city, photo };

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
    originalImage = new Image();
    originalImage.onload = () => {
      openCropModal();
    };
    originalImage.src = reader.result;
    pendingPhotoData = reader.result;
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

exportBtn.addEventListener('click', () => {
  exportData();
});

importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', () => {
  importData();
});

viewModeBtn.addEventListener('click', () => {
  state.viewMode = state.viewMode === 'gallery' ? 'list' : 'gallery';
  render();
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