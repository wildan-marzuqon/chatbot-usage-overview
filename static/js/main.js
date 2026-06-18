document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('api-key');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const modelSelect = document.getElementById('gemini-model');
    const customPromptTextarea = document.getElementById('custom-prompt');
    const charCounter = document.getElementById('char-counter');
    const generateBtn = document.getElementById('btn-generate');
    
    // File inputs & Drop zones
    const fileUsageInput = document.getElementById('file-usage');
    const dropZoneUsage = document.getElementById('drop-zone-usage');
    const detailsUsage = document.getElementById('details-usage');
    const removeUsageBtn = document.getElementById('remove-usage');

    const filePricingInput = document.getElementById('file-pricing');
    const dropZonePricing = document.getElementById('drop-zone-pricing');
    const detailsPricing = document.getElementById('details-pricing');
    const removePricingBtn = document.getElementById('remove-pricing');

    // Right Preview Panel elements
    const previewPanel = document.getElementById('preview-panel');
    const metaDept = document.getElementById('meta-dept');
    const metaPeriod = document.getElementById('meta-period');
    const metaClient = document.getElementById('meta-client');
    const statChat = document.getElementById('stat-chat');
    const statBilling = document.getElementById('stat-billing');
    const statInput = document.getElementById('stat-input');
    const statOutput = document.getElementById('stat-output');
    const statOverPct = document.getElementById('stat-over-pct');
    const statOverCount = document.getElementById('stat-over-count');
    const chatSessTotal = document.querySelector('.chat-sess-total');
    const statAvgBill = document.getElementById('stat-avg-bill');

    // Timeline & Download
    const timelineBox = document.getElementById('generation-timeline');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const downloadArea = document.getElementById('download-area');
    const btnDownload = document.getElementById('btn-download');

    // State Variables
    let selectedUsageFile = null;
    let selectedPricingFile = null;

    // Load saved settings from localStorage
    if (localStorage.getItem('gemini_api_key')) {
        apiKeyInput.value = localStorage.getItem('gemini_api_key');
    }
    if (localStorage.getItem('gemini_model_name')) {
        modelSelect.value = localStorage.getItem('gemini_model_name');
    }

    // Save API key on change
    apiKeyInput.addEventListener('change', () => {
        localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
    });

    // Save model choice on change
    modelSelect.addEventListener('change', () => {
        localStorage.setItem('gemini_model_name', modelSelect.value);
    });

    // Toggle API Key visibility
    toggleApiKeyBtn.addEventListener('click', () => {
        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        const icon = toggleApiKeyBtn.querySelector('i');
        icon.className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    // Character counter for prompt textarea
    customPromptTextarea.addEventListener('input', () => {
        const len = customPromptTextarea.value.length;
        charCounter.textContent = `${len} / 500 karakter`;
    });

    // Quick prompt templates click handler
    document.querySelectorAll('.template-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            customPromptTextarea.value = tag.getAttribute('data-prompt');
            customPromptTextarea.dispatchEvent(new Event('input')); // trigger char count
        });
    });

    // Format numbers with indonesian thousands separators
    function formatIndonesianNumber(num) {
        if (num === null || num === undefined) return "-";
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Set up Drop Zone Handlers
    function setupDropZone(dropZone, fileInput, detailsBlock, removeBtn, fileTypeLabel, onFileSelected) {
        // Dragover
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        // Dragleave
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        // Drop
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.xlsx')) {
                    fileInput.files = e.dataTransfer.files;
                    handleFileSelection(file, dropZone, detailsBlock, removeBtn);
                    onFileSelected(file);
                } else {
                    alert('Format file tidak didukung. Silakan unggah file Excel (.xlsx).');
                }
            }
        });

        // Click on zone
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // File Input Change
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                handleFileSelection(file, dropZone, detailsBlock, removeBtn);
                onFileSelected(file);
            }
        });

        // Remove button click
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            detailsBlock.style.display = 'none';
            dropZone.classList.remove('hidden');
            onFileSelected(null);
        });
    }

    function handleFileSelection(file, dropZone, detailsBlock, removeBtn) {
        dropZone.classList.add('hidden');
        detailsBlock.style.display = 'flex';
        detailsBlock.querySelector('.file-name').textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    }

    // Initialize drop zones
    setupDropZone(dropZoneUsage, fileUsageInput, detailsUsage, removeUsageBtn, 'usage', (file) => {
        selectedUsageFile = file;
        if (file) {
            triggerExcelParse();
        } else {
            resetPreviewPanel();
        }
    });

    setupDropZone(dropZonePricing, filePricingInput, detailsPricing, removePricingBtn, 'pricing', (file) => {
        selectedPricingFile = file;
        // Re-parse excel if usage file was already uploaded to apply new pricing parameters
        if (selectedUsageFile) {
            triggerExcelParse();
        }
    });

    // Parse Excel via API
    function triggerExcelParse() {
        if (!selectedUsageFile) return;

        // Display preview panel with loading states
        previewPanel.classList.remove('hidden-preview');
        previewPanel.classList.add('show-preview');
        setLoadingState(true);
        downloadArea.classList.add('hidden');
        timelineBox.classList.add('hidden');

        const formData = new FormData();
        formData.append('usage_file', selectedUsageFile);
        if (selectedPricingFile) {
            formData.append('pricing_file', selectedPricingFile);
        }

        fetch('/api/parse', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    const msg = err.error + (err.details ? `\n\nDetail Traceback:\n${err.details}` : '');
                    throw new Error(msg);
                });
            }
            return response.json();
        })
        .then(data => {
            setLoadingState(false);
            populateStats(data);
            generateBtn.disabled = false;
        })
        .catch(err => {
            setLoadingState(false);
            resetPreviewPanel();
            alert(`Error: ${err.message}`);
        });
    }

    function setLoadingState(isLoading) {
        const text = isLoading ? 'Loading...' : '-';
        metaDept.textContent = text;
        metaPeriod.textContent = text;
        metaClient.textContent = text;
        statChat.textContent = text;
        statBilling.textContent = text;
        statInput.textContent = text;
        statOutput.textContent = text;
        statOverPct.textContent = '0%';
        statOverCount.textContent = '0';
        chatSessTotal.textContent = '0';
        statAvgBill.textContent = '0.0';
        
        generateBtn.disabled = isLoading || !selectedUsageFile;
    }

    function populateStats(data) {
        metaDept.textContent = data.dept_name;
        metaPeriod.textContent = data.period;
        metaClient.textContent = data.client_name;
        
        statChat.textContent = formatIndonesianNumber(data.chat_sessions);
        statBilling.textContent = formatIndonesianNumber(data.billing_sessions);
        statInput.textContent = formatIndonesianNumber(data.input_tokens);
        statOutput.textContent = formatIndonesianNumber(data.output_tokens);
        
        statOverPct.textContent = `${data.over_billing_pct.toFixed(1)}%`;
        statOverCount.textContent = formatIndonesianNumber(data.over_billing_count);
        chatSessTotal.textContent = formatIndonesianNumber(data.chat_sessions);
        statAvgBill.textContent = data.avg_billing_per_chat.toFixed(2);
    }

    function resetPreviewPanel() {
        previewPanel.classList.remove('show-preview');
        previewPanel.classList.add('hidden-preview');
        generateBtn.disabled = true;
        downloadArea.classList.add('hidden');
        timelineBox.classList.add('hidden');
    }

    // Trigger DOCX generation
    generateBtn.addEventListener('click', () => {
        if (!selectedUsageFile) return;

        // Setup timeline progress log states
        timelineBox.classList.remove('hidden');
        downloadArea.classList.add('hidden');
        generateBtn.disabled = true;
        
        // Show Spinner
        generateBtn.querySelector('.btn-text').classList.add('hidden');
        generateBtn.querySelector('.btn-spinner').classList.remove('hidden');

        // Initial step 1 active
        setStepState(step1, 'loading', 'Mengunggah & menganalisis file Excel...');
        setStepState(step2, 'pending', 'Menghubungi Gemini API untuk analisis kustom...');
        setStepState(step3, 'pending', 'Menyusun layout tabel & kompilasi file DOCX...');

        const formData = new FormData();
        formData.append('usage_file', selectedUsageFile);
        if (selectedPricingFile) {
            formData.append('pricing_file', selectedPricingFile);
        }
        formData.append('gemini_api_key', apiKeyInput.value.trim());
        formData.append('gemini_model', modelSelect.value);
        formData.append('custom_prompt', customPromptTextarea.value.trim());

        // We simulate intermediate timeline steps based on timing for smoother UX
        setTimeout(() => {
            setStepState(step1, 'success', 'File Excel berhasil dianalisis secara matematis.');
            setStepState(step2, 'loading', 'Menghubungi Gemini API untuk kustomisasi insight...');
        }, 1500);

        fetch('/api/generate', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    const msg = err.error + (err.details ? `\n\nDetail Traceback:\n${err.details}` : '');
                    throw new Error(msg);
                });
            }
            // Switch timeline step to compile
            setStepState(step2, 'success', 'Gemini AI berhasil merangkum cover letter & insight kustom.');
            setStepState(step3, 'loading', 'Menyusun layout tabel & kompilasi file DOCX...');
            return response.blob();
        })
        .then(blob => {
            // Success compilation
            setStepState(step3, 'success', 'Laporan DOCX berhasil dibuat dengan styling Adira Finance.');
            
            // Build downlaod link
            const url = window.URL.createObjectURL(blob);
            btnDownload.href = url;
            
            // Determine filename based on headers or defaults
            let filename = `usage_chatbot_report.docx`;
            btnDownload.setAttribute('download', filename);

            // Display Download card
            downloadArea.classList.remove('hidden');
            
            // Reset generate button state
            generateBtn.disabled = false;
            generateBtn.querySelector('.btn-text').classList.remove('hidden');
            generateBtn.querySelector('.btn-spinner').classList.add('hidden');
        })
        .catch(err => {
            alert(`Gagal membuat dokumen: ${err.message}`);
            // Set error in steps
            document.querySelectorAll('.timeline-item').forEach(item => {
                if (item.classList.contains('active') || item.innerHTML.includes('spin')) {
                    setStepState(item, 'error', `Gagal: ${err.message}`);
                }
            });
            
            // Reset generate button state
            generateBtn.disabled = false;
            generateBtn.querySelector('.btn-text').classList.remove('hidden');
            generateBtn.querySelector('.btn-spinner').classList.add('hidden');
        });
    });

    function setStepState(stepElement, state, text) {
        const bullet = stepElement.querySelector('.step-bullet');
        const textNode = stepElement.querySelector('.step-text');
        
        textNode.textContent = text;
        stepElement.className = 'timeline-item'; // reset classes

        if (state === 'pending') {
            bullet.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
            stepElement.classList.add('text-muted');
        } else if (state === 'loading') {
            bullet.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
            stepElement.classList.add('active');
        } else if (state === 'success') {
            bullet.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
            stepElement.classList.add('success');
        } else if (state === 'error') {
            bullet.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
            stepElement.classList.add('text-danger');
        }
    }
});
