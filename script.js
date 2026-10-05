/**
 * S.S. ENTERPRISES — Physical GST Invoice Application
 * Vanilla JavaScript ES6+ (No Frameworks)
 * Handles auto-calculations, split Rs./Ps. columns, SGST/CGST,
 * Indian number-to-words, live editable table, auto-extending particulars,
 * localStorage, direct device downloads (PNG & A4 PDF).
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURATION & DEFAULT DATA
  // ==========================================================================
  const DEFAULT_COMPANY = {
    name: 'S.S. Enterprises',
    dealersLine: 'Stockist & Dealers for all kinds of Water Flow Control Valves, .\nFittings and Pipes Specials.',
    address: 'S. No. 5, Ashrafnagar, Near Alif Tower, Kondhwa Budruk, Pune 411048.',
    email: 'ss.enterprisespune48@gmail.com',
    phone1: '9049731195',
    phone2: '9175731679',
    phone3: '9284307273',
    gstin: '27MVJPS7807M1ZF',
    bankName: 'State Bank of India',
    bankAccName: 'SS Enterprises',
    bankAccNo: '44505053076',
    bankIfsc: 'SBIN0011698',
    bankBranch: 'NIBM Road, Kondhwa, Pune',
    defaultGst: 18
  };

  const MIN_PAD_ROWS = 18; // Authentic pad height matching physical bill

  // State
  let companyProfile = { ...DEFAULT_COMPANY };
  let itemsData = [
    { desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 }
  ];

  // DOM Elements cache
  const elements = {
    // Toolbar Actions
    btnAddItem: document.getElementById('btn-add-item'),
    btnRemoveItem: document.getElementById('btn-remove-item'),
    btnDownloadPng: document.getElementById('btn-download-png'),
    btnDownloadPdf: document.getElementById('btn-download-pdf'),
    btnSettings: document.getElementById('btn-settings'),
    btnSave: document.getElementById('btn-save'),
    btnLoad: document.getElementById('btn-load'),
    btnSampleData: document.getElementById('btn-sample-data'),
    btnClear: document.getElementById('btn-clear'),
    btnPrint: document.getElementById('btn-print'),
    toast: document.getElementById('toast-message'),

    // Invoice Header Displays
    displayCompanyName: document.getElementById('display-company-name'),
    displayDealersLine: document.getElementById('display-dealers-line'),
    displayCompanyAddress: document.getElementById('display-company-address'),
    displayCompanyEmail: document.getElementById('display-company-email'),
    displayPhone1: document.getElementById('display-phone1'),
    displayPhone2: document.getElementById('display-phone2'),
    displayPhone3: document.getElementById('display-phone3'),
    displayGstin: document.getElementById('display-gstin'),
    displayBankName: document.getElementById('display-bank-name'),
    displayBankAccName: document.getElementById('display-bank-accname'),
    displayBankAccNo: document.getElementById('display-bank-accno'),
    displayBankIfsc: document.getElementById('display-bank-ifsc'),
    displayBankBranch: document.getElementById('display-bank-branch'),
    displaySignCompany: document.getElementById('display-sign-company'),

    // Customer & Invoice Meta Inputs
    invCustName: document.getElementById('inv-cust-name'),
    invCustAddr1: document.getElementById('inv-cust-addr1'),
    invCustAddr2: document.getElementById('inv-cust-addr2'),
    invCustGst: document.getElementById('inv-cust-gst'),
    invNumber: document.getElementById('inv-number'),
    invDate: document.getElementById('inv-date'),
    invChallanNo: document.getElementById('inv-challan-no'),
    invChallanDate: document.getElementById('inv-challan-date'),
    invTransporter: document.getElementById('inv-transporter'),
    invMrNo: document.getElementById('inv-mr-no'),
    invArticle: document.getElementById('inv-article'),
    invFreight: document.getElementById('inv-freight'),
    invDocument: document.getElementById('inv-document'),

    // Table & Summary
    tbody: document.getElementById('product-rows-body'),
    invTransport: document.getElementById('inv-transport'),
    displaySubtotalRs: document.getElementById('display-subtotal-rs'),
    displaySubtotalPs: document.getElementById('display-subtotal-ps'),
    displaySgstRs: document.getElementById('display-sgst-rs'),
    displaySgstPs: document.getElementById('display-sgst-ps'),
    displayCgstRs: document.getElementById('display-cgst-rs'),
    displayCgstPs: document.getElementById('display-cgst-ps'),
    displayRoundoffRs: document.getElementById('display-roundoff-rs'),
    displayRoundoffPs: document.getElementById('display-roundoff-ps'),
    displayGrandtotalRs: document.getElementById('display-grandtotal-rs'),
    displayGrandtotalPs: document.getElementById('display-grandtotal-ps'),
    displayAmountWords: document.getElementById('display-amount-words'),

    // Settings Modal
    settingsModal: document.getElementById('settings-modal'),
    modalBackdrop: document.getElementById('settings-backdrop'),
    btnCloseModal: document.getElementById('btn-close-settings'),
    formSettings: document.getElementById('settings-form'),
    btnResetSettings: document.getElementById('btn-reset-settings'),
    cfgCompanyName: document.getElementById('cfg-company-name'),
    cfgDealersLine: document.getElementById('cfg-dealers-line'),
    cfgGstin: document.getElementById('cfg-gstin'),
    cfgDefaultGst: document.getElementById('cfg-default-gst'),
    cfgAddress: document.getElementById('cfg-address'),
    cfgEmail: document.getElementById('cfg-email'),
    cfgPhone1: document.getElementById('cfg-phone1'),
    cfgPhone2: document.getElementById('cfg-phone2'),
    cfgPhone3: document.getElementById('cfg-phone3'),
    cfgBankName: document.getElementById('cfg-bank-name'),
    cfgBankAccName: document.getElementById('cfg-bank-accname'),
    cfgBankAccNo: document.getElementById('cfg-bank-accno'),
    cfgBankIfsc: document.getElementById('cfg-bank-ifsc'),
    cfgBankBranch: document.getElementById('cfg-bank-branch')
  };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    loadCompanySettings();
    setDefaultDates();
    if (window.location.hash === '#sample') {
      loadSampleData();
    } else {
      loadSavedInvoice(false); // quiet auto-load from localStorage if available
    }

    bindEvents();
    renderTable();
    calculateTotal();
    initMobileFeatures();
  }

  // Mobile horizontal scroll helper
  function initMobileFeatures() {
    const scrollWrapper = document.getElementById('paper-scroll-wrapper');
    const swipeGuide = document.querySelector('.mobile-swipe-guide');
    if (scrollWrapper && swipeGuide) {
      scrollWrapper.addEventListener('scroll', () => {
        if (scrollWrapper.scrollLeft > 25) {
          swipeGuide.style.opacity = '0';
          swipeGuide.style.pointerEvents = 'none';
        } else {
          swipeGuide.style.opacity = '1';
          swipeGuide.style.pointerEvents = 'auto';
        }
      }, { passive: true });
    }
  }

  // Set today's date in Indian format DD/MM/YYYY
  function setDefaultDates() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}/${mm}/${yyyy}`;

    if (elements.invDate && !elements.invDate.value) {
      elements.invDate.value = dateStr;
    }
  }

  // ==========================================================================
  // EVENT BINDINGS
  // ==========================================================================
  function bindEvents() {
    if (elements.btnAddItem) {
      elements.btnAddItem.addEventListener('click', () => addProductRow());
    }

    if (elements.btnRemoveItem) {
      elements.btnRemoveItem.addEventListener('click', () => removeProductRow());
    }

    if (elements.btnDownloadPng) {
      elements.btnDownloadPng.addEventListener('click', downloadPNG);
    }

    if (elements.btnDownloadPdf) {
      elements.btnDownloadPdf.addEventListener('click', downloadPDF);
    }

    if (elements.btnSettings) {
      elements.btnSettings.addEventListener('click', openSettingsModal);
    }

    if (elements.btnSave) {
      elements.btnSave.addEventListener('click', () => saveInvoice(true));
    }

    if (elements.btnLoad) {
      elements.btnLoad.addEventListener('click', () => loadSavedInvoice(true));
    }

    if (elements.btnSampleData) {
      elements.btnSampleData.addEventListener('click', loadSampleData);
    }

    if (elements.btnClear) {
      elements.btnClear.addEventListener('click', clearInvoice);
    }

    if (elements.btnPrint) {
      elements.btnPrint.addEventListener('click', printInvoice);
    }

    // Modal Events
    if (elements.btnCloseModal) {
      elements.btnCloseModal.addEventListener('click', closeSettingsModal);
    }

    if (elements.modalBackdrop) {
      elements.modalBackdrop.addEventListener('click', closeSettingsModal);
    }

    if (elements.formSettings) {
      elements.formSettings.addEventListener('submit', handleSaveSettings);
    }

    if (elements.btnResetSettings) {
      elements.btnResetSettings.addEventListener('click', handleResetSettings);
    }

    // Transport input change
    if (elements.invTransport) {
      elements.invTransport.addEventListener('input', () => {
        calculateTotal();
        saveInvoice(false);
      });
    }

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.settingsModal && elements.settingsModal.classList.contains('is-open')) {
        closeSettingsModal();
      }
    });

    // Auto-save on customer field edits
    const metaInputs = [
      elements.invCustName, elements.invCustAddr1, elements.invCustAddr2, elements.invCustGst,
      elements.invNumber, elements.invDate, elements.invChallanNo, elements.invChallanDate,
      elements.invTransporter, elements.invMrNo, elements.invArticle, elements.invFreight, elements.invDocument
    ];
    metaInputs.forEach(inp => {
      if (inp) {
        inp.addEventListener('input', () => {
          saveInvoice(false);
        });
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        saveInvoice(false);
      }
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        addProductRow();
      }
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveInvoice(true);
      }
    });
  }

  // ==========================================================================
  // TABLE RENDERING & DYNAMIC ROWS
  // ==========================================================================
  function renderTable() {
    if (!elements.tbody) return;
    elements.tbody.innerHTML = '';

    const totalRowsToRender = Math.max(itemsData.length, MIN_PAD_ROWS);

    for (let i = 0; i < totalRowsToRender; i++) {
      const isExistingItem = i < itemsData.length;
      const item = isExistingItem ? itemsData[i] : { desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 };
      const tr = document.createElement('tr');
      tr.dataset.index = i;

      const hasContent = item.desc || item.hsn || item.weight || item.qty !== '' || item.rate !== '';
      const srText = (isExistingItem && hasContent) ? (i + 1) : '';

      // Split amount into Rs and Ps
      let rsText = '';
      let psText = '';
      if (item.amount > 0) {
        const parts = splitRsPs(item.amount);
        rsText = parts.rs;
        psText = parts.ps;
      }

      tr.innerHTML = `
        <td class="td-sr">
          ${isExistingItem && hasContent ? `
            <div class="row-actions no-print">
              <button type="button" class="btn-row-del" title="Delete row" data-del-index="${i}">✕</button>
            </div>
          ` : ''}
          <span class="sr-num">${srText}</span>
        </td>
        <td class="td-particulars">
          <textarea class="seamless-input input-desc" rows="1" placeholder="" autocomplete="off" spellcheck="false">${escapeHtml(item.desc)}</textarea>
        </td>
        <td class="td-hsn">
          <input type="text" class="seamless-input input-hsn" value="${escapeHtml(item.hsn)}" placeholder="" autocomplete="off">
        </td>
        <td class="td-weight">
          <input type="text" class="seamless-input input-weight" value="${escapeHtml(item.weight || '')}" placeholder="" autocomplete="off">
        </td>
        <td class="td-qty">
          <input type="number" step="any" min="0" class="seamless-input input-qty" value="${item.qty !== '' ? item.qty : ''}" placeholder="" autocomplete="off">
        </td>
        <td class="td-rate">
          <input type="number" step="any" min="0" class="seamless-input input-rate" value="${item.rate !== '' ? item.rate : ''}" placeholder="" autocomplete="off">
        </td>
        <td class="td-gst">
          <input type="number" step="any" min="0" class="seamless-input input-gst" value="${item.gst !== undefined && item.gst !== '' ? item.gst : ''}" placeholder="" autocomplete="off">
        </td>
        <td class="td-rs">
          <span class="val-rs">${rsText}</span>
        </td>
        <td class="td-ps">
          <span class="val-ps">${psText}</span>
        </td>
      `;

      attachRowEvents(tr, i);
      elements.tbody.appendChild(tr);

      const descTa = tr.querySelector('.input-desc');
      if (descTa && descTa.value) {
        descTa.style.height = 'auto';
        descTa.style.height = Math.max(22, descTa.scrollHeight) + 'px';
      }
    }
  }

  function attachRowEvents(tr, index) {
    const descInput = tr.querySelector('.input-desc');
    const hsnInput = tr.querySelector('.input-hsn');
    const weightInput = tr.querySelector('.input-weight');
    const qtyInput = tr.querySelector('.input-qty');
    const rateInput = tr.querySelector('.input-rate');
    const gstInput = tr.querySelector('.input-gst');
    const btnDel = tr.querySelector('.btn-row-del');

    if (btnDel) {
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteRowAtIndex(index);
      });
    }

    const autoResizeDesc = () => {
      if (!descInput) return;
      descInput.style.height = 'auto';
      descInput.style.height = Math.max(22, descInput.scrollHeight) + 'px';
    };

    const handleInputChange = () => {
      if (index >= itemsData.length) {
        while (itemsData.length <= index) {
          itemsData.push({ desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 });
        }
      }

      const rowItem = itemsData[index];
      rowItem.desc = descInput ? descInput.value : '';
      rowItem.hsn = hsnInput ? hsnInput.value : '';
      rowItem.weight = weightInput ? weightInput.value : '';
      rowItem.qty = qtyInput ? qtyInput.value : '';
      rowItem.rate = rateInput ? rateInput.value : '';
      rowItem.gst = gstInput ? gstInput.value : '';

      calculateRowAmount(tr, index);
      calculateTotal();
      saveInvoice(false);
    };

    if (descInput) {
      descInput.addEventListener('input', () => {
        autoResizeDesc();
        handleInputChange();
      });
    }

    [hsnInput, weightInput, qtyInput, rateInput, gstInput].forEach(inp => {
      if (inp) {
        inp.addEventListener('input', handleInputChange);
      }
    });
  }

  // ==========================================================================
  // ROW CALCULATIONS
  // ==========================================================================
  function calculateRowAmount(tr, index) {
    if (index >= itemsData.length) return;

    const rowItem = itemsData[index];
    const qty = parseFloat(rowItem.qty);
    const rate = parseFloat(rowItem.rate);

    let amount = 0;
    if (!isNaN(qty) && !isNaN(rate) && qty >= 0 && rate >= 0) {
      amount = Math.round(qty * rate * 100) / 100;
    }

    rowItem.amount = amount;

    const rsDisplay = tr.querySelector('.val-rs');
    const psDisplay = tr.querySelector('.val-ps');

    if (amount > 0) {
      const parts = splitRsPs(amount);
      if (rsDisplay) rsDisplay.textContent = parts.rs;
      if (psDisplay) psDisplay.textContent = parts.ps;
    } else {
      if (rsDisplay) rsDisplay.textContent = '';
      if (psDisplay) psDisplay.textContent = '';
    }

    const srDisplay = tr.querySelector('.sr-num');
    const hasData = rowItem.desc || rowItem.hsn || rowItem.weight || rowItem.qty !== '' || rowItem.rate !== '';
    if (srDisplay) {
      srDisplay.textContent = hasData ? (index + 1) : '';
    }
  }

  function addProductRow(data = null) {
    const newItem = data || { desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 };
    itemsData.push(newItem);
    renderTable();
    calculateTotal();

    if (elements.tbody) {
      const lastRowIndex = itemsData.length - 1;
      const rows = elements.tbody.querySelectorAll('tr');
      if (rows[lastRowIndex]) {
        const desc = rows[lastRowIndex].querySelector('.input-desc');
        if (desc) desc.focus();
      }
    }
  }

  function removeProductRow() {
    if (itemsData.length <= 1) {
      itemsData[0] = { desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 };
      renderTable();
      calculateTotal();
      showToast('Cleared first item');
      return;
    }

    itemsData.pop();
    renderTable();
    calculateTotal();
    saveInvoice(false);
    showToast('Last item removed');
  }

  function deleteRowAtIndex(index) {
    if (itemsData.length <= 1) {
      itemsData[0] = { desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 };
    } else {
      itemsData.splice(index, 1);
    }
    renderTable();
    calculateTotal();
    saveInvoice(false);
    showToast('Item deleted');
  }

  // ==========================================================================
  // TOTALS & GST CALCULATIONS
  // ==========================================================================
  function calculateTotal() {
    let subtotal = 0;
    let totalGstAmount = 0;

    const defaultGstRate = parseFloat(companyProfile.defaultGst) || 0;

    itemsData.forEach(item => {
      const amt = parseFloat(item.amount);
      if (!isNaN(amt) && amt > 0) {
        subtotal += amt;
        const itemGstRate = (item.gst !== '' && item.gst !== undefined) ? parseFloat(item.gst) : defaultGstRate;
        if (!isNaN(itemGstRate) && itemGstRate > 0) {
          totalGstAmount += Math.round(amt * (itemGstRate / 100) * 100) / 100;
        }
      }
    });

    subtotal = Math.round(subtotal * 100) / 100;
    totalGstAmount = Math.round(totalGstAmount * 100) / 100;

    // Transport / freight charge
    let transport = 0;
    if (elements.invTransport && elements.invTransport.value) {
      transport = parseFloat(elements.invTransport.value) || 0;
    }

    // Split GST equally into SGST (half) and CGST (half)
    const sgst = Math.round((totalGstAmount / 2) * 100) / 100;
    const cgst = Math.round((totalGstAmount - sgst) * 100) / 100;

    // Unrounded grand total
    const unroundedTotal = subtotal + transport + sgst + cgst;
    const finalGrandTotal = Math.round(unroundedTotal);
    const roundOff = Math.round((finalGrandTotal - unroundedTotal) * 100) / 100;

    // Display Subtotal
    updateSplitCell(elements.displaySubtotalRs, elements.displaySubtotalPs, subtotal);

    // Display SGST
    updateSplitCell(elements.displaySgstRs, elements.displaySgstPs, sgst);

    // Display CGST
    updateSplitCell(elements.displayCgstRs, elements.displayCgstPs, cgst);

    // Display Round Off
    if (elements.displayRoundoffRs && elements.displayRoundoffPs) {
      if (roundOff !== 0) {
        const sign = roundOff > 0 ? '+' : '';
        elements.displayRoundoffRs.textContent = `${sign}${roundOff.toFixed(2)}`;
        elements.displayRoundoffPs.textContent = '';
      } else {
        elements.displayRoundoffRs.textContent = '0';
        elements.displayRoundoffPs.textContent = '00';
      }
    }

    // Display Grand Total
    updateSplitCell(elements.displayGrandtotalRs, elements.displayGrandtotalPs, finalGrandTotal);

    // Amount in Words
    if (finalGrandTotal > 0) {
      const words = numberToWordsIndian(finalGrandTotal);
      if (elements.displayAmountWords) {
        elements.displayAmountWords.textContent = words;
      }
    } else {
      if (elements.displayAmountWords) {
        elements.displayAmountWords.textContent = '';
      }
    }
  }

  function updateSplitCell(elRs, elPs, val) {
    if (!elRs || !elPs) return;
    if (val > 0) {
      const parts = splitRsPs(val);
      elRs.textContent = parts.rs;
      elPs.textContent = parts.ps;
    } else {
      elRs.textContent = '0';
      elPs.textContent = '00';
    }
  }

  // Splits a number into formatted Rs and 2-digit Ps
  function splitRsPs(amount) {
    const num = Math.abs(parseFloat(amount) || 0);
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    const rsFormatted = rupees.toLocaleString('en-IN');
    const psFormatted = String(paise).padStart(2, '0');

    return { rs: rsFormatted, ps: psFormatted };
  }

  // Indian Numbering System to Words Converter
  function numberToWordsIndian(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return '';
    const num = parseFloat(amount);
    if (num === 0) return 'Zero Rupees Only';

    const units = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertGroup(n) {
      let str = '';
      if (n >= 100) {
        str += units[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '') + ' ';
      } else if (n > 0) {
        str += units[n] + ' ';
      }
      return str.trim();
    }

    const rupees = Math.floor(Math.abs(num));
    const paise = Math.round((Math.abs(num) - rupees) * 100);

    const crore = Math.floor(rupees / 10000000);
    const remCrore = rupees % 10000000;
    const lakh = Math.floor(remCrore / 100000);
    const remLakh = remCrore % 100000;
    const thousand = Math.floor(remLakh / 1000);
    const remThousand = remLakh % 1000;

    let words = '';
    if (crore > 0) words += convertGroup(crore) + ' Crore ';
    if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
    if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
    if (remThousand > 0) words += convertGroup(remThousand) + ' ';

    words = words.trim();

    let result = '';
    if (words) {
      result = words + ' Rupees';
      if (paise > 0) {
        result += ' and ' + convertGroup(paise) + ' Paise';
      }
    } else if (paise > 0) {
      result = convertGroup(paise) + ' Paise';
    } else {
      result = 'Zero Rupees';
    }

    result += ' Only';
    return result;
  }

  // ==========================================================================
  // COMPANY SETTINGS & PROFILE
  // ==========================================================================
  function loadCompanySettings() {
    try {
      const stored = localStorage.getItem('ss_company_settings');
      if (stored) {
        companyProfile = Object.assign({}, DEFAULT_COMPANY, JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read SS company settings from storage', e);
      companyProfile = { ...DEFAULT_COMPANY };
    }
    applyCompanyProfile();
  }

  function applyCompanyProfile() {
    if (elements.displayCompanyName) elements.displayCompanyName.textContent = companyProfile.name || DEFAULT_COMPANY.name;
    if (elements.displayDealersLine) elements.displayDealersLine.textContent = companyProfile.dealersLine || DEFAULT_COMPANY.dealersLine;
    if (elements.displayCompanyAddress) elements.displayCompanyAddress.textContent = companyProfile.address || DEFAULT_COMPANY.address;
    if (elements.displayCompanyEmail) elements.displayCompanyEmail.textContent = companyProfile.email || DEFAULT_COMPANY.email;
    if (elements.displayPhone1) elements.displayPhone1.textContent = companyProfile.phone1 || DEFAULT_COMPANY.phone1;
    if (elements.displayPhone2) elements.displayPhone2.textContent = companyProfile.phone2 || DEFAULT_COMPANY.phone2;
    if (elements.displayPhone3) elements.displayPhone3.textContent = companyProfile.phone3 || DEFAULT_COMPANY.phone3;
    if (elements.displayGstin) elements.displayGstin.textContent = companyProfile.gstin || DEFAULT_COMPANY.gstin;

    if (elements.displayBankName) elements.displayBankName.textContent = companyProfile.bankName || DEFAULT_COMPANY.bankName;
    if (elements.displayBankAccName) elements.displayBankAccName.textContent = companyProfile.bankAccName || DEFAULT_COMPANY.bankAccName;
    if (elements.displayBankAccNo) elements.displayBankAccNo.textContent = companyProfile.bankAccNo || DEFAULT_COMPANY.bankAccNo;
    if (elements.displayBankIfsc) elements.displayBankIfsc.textContent = companyProfile.bankIfsc || DEFAULT_COMPANY.bankIfsc;
    if (elements.displayBankBranch) elements.displayBankBranch.textContent = companyProfile.bankBranch || DEFAULT_COMPANY.bankBranch;
    if (elements.displaySignCompany) elements.displaySignCompany.textContent = companyProfile.name || DEFAULT_COMPANY.name;

    // Populate modal inputs
    if (elements.cfgCompanyName) elements.cfgCompanyName.value = companyProfile.name;
    if (elements.cfgDealersLine) elements.cfgDealersLine.value = companyProfile.dealersLine;
    if (elements.cfgGstin) elements.cfgGstin.value = companyProfile.gstin;
    if (elements.cfgDefaultGst) elements.cfgDefaultGst.value = companyProfile.defaultGst !== undefined ? companyProfile.defaultGst : 18;
    if (elements.cfgAddress) elements.cfgAddress.value = companyProfile.address;
    if (elements.cfgEmail) elements.cfgEmail.value = companyProfile.email;
    if (elements.cfgPhone1) elements.cfgPhone1.value = companyProfile.phone1;
    if (elements.cfgPhone2) elements.cfgPhone2.value = companyProfile.phone2;
    if (elements.cfgPhone3) elements.cfgPhone3.value = companyProfile.phone3;
    if (elements.cfgBankName) elements.cfgBankName.value = companyProfile.bankName;
    if (elements.cfgBankAccName) elements.cfgBankAccName.value = companyProfile.bankAccName;
    if (elements.cfgBankAccNo) elements.cfgBankAccNo.value = companyProfile.bankAccNo;
    if (elements.cfgBankIfsc) elements.cfgBankIfsc.value = companyProfile.bankIfsc;
    if (elements.cfgBankBranch) elements.cfgBankBranch.value = companyProfile.bankBranch;
  }

  function openSettingsModal() {
    if (!elements.settingsModal) return;
    elements.settingsModal.classList.add('is-open');
    elements.settingsModal.setAttribute('aria-hidden', 'false');
    if (elements.cfgCompanyName) elements.cfgCompanyName.focus();
  }

  function closeSettingsModal() {
    if (!elements.settingsModal) return;
    elements.settingsModal.classList.remove('is-open');
    elements.settingsModal.setAttribute('aria-hidden', 'true');
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    companyProfile.name = (elements.cfgCompanyName && elements.cfgCompanyName.value.trim()) || DEFAULT_COMPANY.name;
    companyProfile.dealersLine = (elements.cfgDealersLine && elements.cfgDealersLine.value.trim()) || DEFAULT_COMPANY.dealersLine;
    companyProfile.gstin = (elements.cfgGstin && elements.cfgGstin.value.trim()) || DEFAULT_COMPANY.gstin;
    companyProfile.defaultGst = elements.cfgDefaultGst ? parseFloat(elements.cfgDefaultGst.value) || 0 : 18;
    companyProfile.address = (elements.cfgAddress && elements.cfgAddress.value.trim()) || DEFAULT_COMPANY.address;
    companyProfile.email = (elements.cfgEmail && elements.cfgEmail.value.trim()) || DEFAULT_COMPANY.email;
    companyProfile.phone1 = (elements.cfgPhone1 && elements.cfgPhone1.value.trim()) || DEFAULT_COMPANY.phone1;
    companyProfile.phone2 = (elements.cfgPhone2 && elements.cfgPhone2.value.trim()) || DEFAULT_COMPANY.phone2;
    companyProfile.phone3 = (elements.cfgPhone3 && elements.cfgPhone3.value.trim()) || DEFAULT_COMPANY.phone3;
    companyProfile.bankName = (elements.cfgBankName && elements.cfgBankName.value.trim()) || DEFAULT_COMPANY.bankName;
    companyProfile.bankAccName = (elements.cfgBankAccName && elements.cfgBankAccName.value.trim()) || DEFAULT_COMPANY.bankAccName;
    companyProfile.bankAccNo = (elements.cfgBankAccNo && elements.cfgBankAccNo.value.trim()) || DEFAULT_COMPANY.bankAccNo;
    companyProfile.bankIfsc = (elements.cfgBankIfsc && elements.cfgBankIfsc.value.trim()) || DEFAULT_COMPANY.bankIfsc;
    companyProfile.bankBranch = (elements.cfgBankBranch && elements.cfgBankBranch.value.trim()) || DEFAULT_COMPANY.bankBranch;

    try {
      localStorage.setItem('ss_company_settings', JSON.stringify(companyProfile));
    } catch (err) {
      console.error(err);
    }

    applyCompanyProfile();
    calculateTotal();
    closeSettingsModal();
    showToast('Company details updated');
  }

  function handleResetSettings() {
    if (confirm('Reset company details to original S.S. Enterprises defaults?')) {
      companyProfile = { ...DEFAULT_COMPANY };
      try {
        localStorage.removeItem('ss_company_settings');
      } catch (err) {}
      applyCompanyProfile();
      calculateTotal();
      closeSettingsModal();
      showToast('Reset to original S.S. Enterprises details');
    }
  }

  // ==========================================================================
  // STORAGE (SAVE / LOAD / CLEAR)
  // ==========================================================================
  function saveInvoice(showToastMsg = true) {
    const invoiceData = {
      invCustName: elements.invCustName ? elements.invCustName.value : '',
      invCustAddr1: elements.invCustAddr1 ? elements.invCustAddr1.value : '',
      invCustAddr2: elements.invCustAddr2 ? elements.invCustAddr2.value : '',
      invCustGst: elements.invCustGst ? elements.invCustGst.value : '',
      invNumber: elements.invNumber ? elements.invNumber.value : '',
      invDate: elements.invDate ? elements.invDate.value : '',
      invChallanNo: elements.invChallanNo ? elements.invChallanNo.value : '',
      invChallanDate: elements.invChallanDate ? elements.invChallanDate.value : '',
      invTransporter: elements.invTransporter ? elements.invTransporter.value : '',
      invMrNo: elements.invMrNo ? elements.invMrNo.value : '',
      invArticle: elements.invArticle ? elements.invArticle.value : '',
      invFreight: elements.invFreight ? elements.invFreight.value : '',
      invDocument: elements.invDocument ? elements.invDocument.value : '',
      invTransport: elements.invTransport ? elements.invTransport.value : '0.00',
      items: itemsData.filter(it => it.desc || it.hsn || it.weight || it.qty || it.rate)
    };

    try {
      localStorage.setItem('ss_invoice_current', JSON.stringify(invoiceData));
      if (showToastMsg) {
        showToast('Invoice saved successfully');
      }
    } catch (e) {
      console.error('Failed to save to localStorage', e);
      if (showToastMsg) {
        showToast('Failed to save invoice');
      }
    }
  }

  function loadSavedInvoice(showToastMsg = true) {
    try {
      const saved = localStorage.getItem('ss_invoice_current');
      if (!saved) {
        if (showToastMsg) showToast('No saved invoice found');
        return;
      }

      const invoiceData = JSON.parse(saved);
      if (invoiceData.invCustName !== undefined && elements.invCustName) elements.invCustName.value = invoiceData.invCustName;
      if (invoiceData.invCustAddr1 !== undefined && elements.invCustAddr1) elements.invCustAddr1.value = invoiceData.invCustAddr1;
      if (invoiceData.invCustAddr2 !== undefined && elements.invCustAddr2) elements.invCustAddr2.value = invoiceData.invCustAddr2;
      if (invoiceData.invCustGst !== undefined && elements.invCustGst) elements.invCustGst.value = invoiceData.invCustGst;
      if (invoiceData.invNumber && elements.invNumber) elements.invNumber.value = invoiceData.invNumber;
      if (invoiceData.invDate && elements.invDate) elements.invDate.value = invoiceData.invDate;
      if (invoiceData.invChallanNo !== undefined && elements.invChallanNo) elements.invChallanNo.value = invoiceData.invChallanNo;
      if (invoiceData.invChallanDate !== undefined && elements.invChallanDate) elements.invChallanDate.value = invoiceData.invChallanDate;
      if (invoiceData.invTransporter !== undefined && elements.invTransporter) elements.invTransporter.value = invoiceData.invTransporter;
      if (invoiceData.invMrNo !== undefined && elements.invMrNo) elements.invMrNo.value = invoiceData.invMrNo;
      if (invoiceData.invArticle !== undefined && elements.invArticle) elements.invArticle.value = invoiceData.invArticle;
      if (invoiceData.invFreight !== undefined && elements.invFreight) elements.invFreight.value = invoiceData.invFreight;
      if (invoiceData.invDocument !== undefined && elements.invDocument) elements.invDocument.value = invoiceData.invDocument;
      if (invoiceData.invTransport !== undefined && elements.invTransport) elements.invTransport.value = invoiceData.invTransport;

      if (Array.isArray(invoiceData.items) && invoiceData.items.length > 0) {
        itemsData = invoiceData.items.map(it => {
          const qty = parseFloat(it.qty);
          const rate = parseFloat(it.rate);
          const amount = (!isNaN(qty) && !isNaN(rate)) ? Math.round(qty * rate * 100) / 100 : 0;
          return {
            desc: it.desc || '',
            hsn: it.hsn || '',
            weight: it.weight || '',
            qty: it.qty !== undefined ? it.qty : '',
            rate: it.rate !== undefined ? it.rate : '',
            gst: it.gst !== undefined ? it.gst : '',
            amount: amount
          };
        });
      } else {
        itemsData = [{ desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 }];
      }

      renderTable();
      calculateTotal();
      if (showToastMsg) showToast('Invoice loaded from storage');
    } catch (e) {
      console.error('Failed to load invoice from localStorage', e);
      if (showToastMsg) showToast('Error loading saved invoice');
    }
  }

  function clearInvoice() {
    if (!confirm('Are you sure you want to clear all fields?')) return;

    if (elements.invNumber) elements.invNumber.value = '021';
    setDefaultDates();
    if (elements.invCustName) elements.invCustName.value = '';
    if (elements.invCustAddr1) elements.invCustAddr1.value = '';
    if (elements.invCustAddr2) elements.invCustAddr2.value = '';
    if (elements.invCustGst) elements.invCustGst.value = '';
    if (elements.invChallanNo) elements.invChallanNo.value = '';
    if (elements.invTransporter) elements.invTransporter.value = '';
    if (elements.invMrNo) elements.invMrNo.value = '';
    if (elements.invArticle) elements.invArticle.value = '';
    if (elements.invFreight) elements.invFreight.value = '';
    if (elements.invDocument) elements.invDocument.value = '';
    if (elements.invTransport) elements.invTransport.value = '0.00';

    itemsData = [{ desc: '', hsn: '', weight: '', qty: '', rate: '', gst: '', amount: 0 }];

    renderTable();
    calculateTotal();
    try {
      localStorage.removeItem('ss_invoice_current');
    } catch (e) {}

    showToast('Invoice cleared');
  }

  // ==========================================================================
  // SAMPLE DATA
  // ==========================================================================
  function loadSampleData() {
    if (elements.invNumber) elements.invNumber.value = '021';
    setDefaultDates();
    if (elements.invCustName) elements.invCustName.value = 'Skyline Infrastructure & Projects Pvt. Ltd.';
    if (elements.invCustAddr1) elements.invCustAddr1.value = 'Plot No. 42, Hadapsar Industrial Estate';
    if (elements.invCustAddr2) elements.invCustAddr2.value = 'Hadapsar, Pune, Maharashtra - 411013';
    if (elements.invCustGst) elements.invCustGst.value = '27AABCS1429B1Z4';
    if (elements.invChallanNo) elements.invChallanNo.value = 'CH-892';
    if (elements.invTransporter) elements.invTransporter.value = 'Navata Road Transport';
    if (elements.invMrNo) elements.invMrNo.value = 'MR-5521';
    if (elements.invArticle) elements.invArticle.value = '4 Wooden Crates';
    if (elements.invFreight) elements.invFreight.value = 'Paid';
    if (elements.invDocument) elements.invDocument.value = 'Direct';
    if (elements.invTransport) elements.invTransport.value = '750.00';

    itemsData = [
      { desc: 'CI Dual Plate Check Valve PN 16 - 100mm Flanged End', hsn: '8481', weight: '18.5 Kg', qty: '4', rate: '3450', gst: '18', amount: 13800 },
      { desc: 'Cast Iron Sluice Valve Class-1 with Handwheel - 80mm', hsn: '8481', weight: '24.0 Kg', qty: '2', rate: '4800', gst: '18', amount: 9600 },
      { desc: 'SS 304 Wafer Type Butterfly Valve with Lever - 65mm', hsn: '8481', weight: '4.2 Kg', qty: '6', rate: '1650', gst: '18', amount: 9900 },
      { desc: 'MS Heavy Duty Pipe Specials & Flange Adaptor', hsn: '7307', weight: '12.0 Kg', qty: '5', rate: '850', gst: '18', amount: 4250 }
    ];

    renderTable();
    calculateTotal();
    saveInvoice(false);
    showToast('Realistic sample invoice loaded');
  }

  // ==========================================================================
  // EXPORT AS PNG & PDF — DIRECT TO DEVICE DOWNLOAD
  // ==========================================================================
  function prepareClonedInvoiceForCapture(clonedDoc) {
    const noPrintEls = clonedDoc.querySelectorAll('.no-print');
    noPrintEls.forEach(el => { el.style.display = 'none'; });

    const clonedWrapper = clonedDoc.getElementById('paper-scroll-wrapper');
    if (clonedWrapper) {
      clonedWrapper.style.overflow = 'visible';
      clonedWrapper.style.transform = 'none';
      clonedWrapper.scrollLeft = 0;
    }

    const clonedWorkspace = clonedDoc.querySelector('.workspace-container');
    if (clonedWorkspace) {
      clonedWorkspace.style.padding = '0';
      clonedWorkspace.style.margin = '0';
    }

    const clonedInvoice = clonedDoc.getElementById('invoice-paper');
    if (clonedInvoice) {
      clonedInvoice.style.transform = 'none';
      clonedInvoice.style.margin = '0 auto';
      clonedInvoice.style.boxShadow = 'none';
      clonedInvoice.style.padding = '16px 20px';
      clonedInvoice.style.width = '794px';
    }

    const trs = clonedDoc.querySelectorAll('#product-rows-body tr');
    trs.forEach(tr => {
      tr.style.height = '24px';
    });

    // Replace inputs and textareas with standard spans for accurate rendering
    const inputs = clonedDoc.querySelectorAll('#invoice-paper input, #invoice-paper textarea');
    inputs.forEach(inp => {
      const span = clonedDoc.createElement('span');
      span.textContent = inp.value || '';
      span.className = inp.className;
      const comp = window.getComputedStyle(inp);
      span.style.fontFamily = comp.fontFamily;
      span.style.fontSize = comp.fontSize;
      span.style.fontWeight = comp.fontWeight;
      span.style.color = comp.color;
      span.style.textAlign = comp.textAlign;
      span.style.boxSizing = 'border-box';
      span.style.padding = '0 2px';

      if (inp.closest('td')) {
        span.style.display = 'block';
        span.style.width = '100%';
        span.style.minHeight = '20px';

        if (inp.classList.contains('input-desc')) {
          span.style.whiteSpace = 'pre-wrap';
          span.style.wordBreak = 'break-word';
          span.style.overflow = 'visible';
          span.style.lineHeight = '1.3';
        } else {
          span.style.overflow = 'hidden';
          span.style.whiteSpace = 'nowrap';
          span.style.lineHeight = '1.25';
        }
      } else {
        span.style.display = 'inline-block';
        span.style.width = '100%';
        span.style.verticalAlign = 'baseline';
      }

      if (inp.parentNode) {
        inp.parentNode.replaceChild(span, inp);
      }
    });
  }

  function downloadDirectFile(blob, fileName) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 15000);

    showToast('Downloaded ' + fileName);
  }

  function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  async function downloadPNG() {
    const invoiceEl = document.getElementById('invoice-paper');
    if (!invoiceEl) return;

    showToast('Generating high-resolution PNG...');

    const origTransform = invoiceEl.style.transform;
    invoiceEl.style.transform = 'none';

    try {
      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library is not loaded');
      }

      const isFileOrigin = window.location.protocol === 'file:';

      const canvas = await html2canvas(invoiceEl, {
        scale: 2,
        useCORS: !isFileOrigin,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: invoiceEl.offsetWidth || 794,
        height: invoiceEl.offsetHeight,
        windowWidth: 1024,
        windowHeight: (invoiceEl.offsetHeight || 1100) + 100,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: prepareClonedInvoiceForCapture
      });

      invoiceEl.style.transform = origTransform;

      const rawNum = elements.invNumber ? elements.invNumber.value : '021';
      const invNum = (rawNum || '021').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = 'SS_Enterprises_Invoice_' + invNum + '.png';

      const getBlob = () => {
        return new Promise((resolve) => {
          if (canvas.toBlob) {
            try {
              canvas.toBlob((b) => {
                if (b) {
                  resolve(b);
                } else {
                  resolve(dataURItoBlob(canvas.toDataURL('image/png')));
                }
              }, 'image/png', 1.0);
              return;
            } catch (err) {
              console.warn('toBlob error, using dataURItoBlob fallback', err);
            }
          }
          resolve(dataURItoBlob(canvas.toDataURL('image/png')));
        });
      };

      const blob = await getBlob();
      downloadDirectFile(blob, fileName);

    } catch (err) {
      invoiceEl.style.transform = origTransform;
      console.error('Error generating PNG:', err);
      showToast('Error generating PNG: ' + (err.message || err));
    }
  }

  async function downloadPDF() {
    const invoiceEl = document.getElementById('invoice-paper');
    if (!invoiceEl) return;

    showToast('Generating A4 PDF document...');

    const origTransform = invoiceEl.style.transform;
    invoiceEl.style.transform = 'none';

    try {
      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library is not loaded');
      }
      if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
        throw new Error('jsPDF library is not loaded');
      }

      const isFileOrigin = window.location.protocol === 'file:';

      const canvas = await html2canvas(invoiceEl, {
        scale: 2,
        useCORS: !isFileOrigin,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: invoiceEl.offsetWidth || 794,
        height: invoiceEl.offsetHeight,
        windowWidth: 1024,
        windowHeight: (invoiceEl.offsetHeight || 1100) + 100,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: prepareClonedInvoiceForCapture
      });

      invoiceEl.style.transform = origTransform;

      const jsPDFClass = window.jspdf ? window.jspdf.jsPDF : jsPDF;
      const pdf = new jsPDFClass({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 6;
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, '', 'FAST');

      const rawNum = elements.invNumber ? elements.invNumber.value : '021';
      const invNum = (rawNum || '021').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = 'SS_Enterprises_Invoice_' + invNum + '.pdf';

      const pdfBlob = pdf.output('blob');
      downloadDirectFile(pdfBlob, fileName);

    } catch (err) {
      invoiceEl.style.transform = origTransform;
      console.error('Error generating PDF:', err);
      showToast('Error generating PDF: ' + (err.message || err));
    }
  }

  function printInvoice() {
    if (elements.invNumber && !elements.invNumber.value.trim()) {
      alert('Please enter an Invoice Number before printing.');
      elements.invNumber.focus();
      return;
    }

    if (elements.invDate && !elements.invDate.value.trim()) {
      alert('Please enter an Invoice Date before printing.');
      elements.invDate.focus();
      return;
    }

    saveInvoice(false);
    window.print();
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  function showToast(msg) {
    if (!elements.toast) return;
    elements.toast.textContent = msg;
    elements.toast.classList.add('show');
    clearTimeout(elements.toast._timer);
    elements.toast._timer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
