document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const useAiToggle = document.getElementById('use-ai-toggle');
    const aiConfigSection = document.getElementById('ai-config-section');
    
    const providerRadios = document.querySelectorAll('input[name="ai-provider"]');
    const providerOptions = document.querySelectorAll('.provider-option');
    
    const apiKeyLabel = document.getElementById('api-key-label');
    const apiKeyInput = document.getElementById('api-key');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    
    const geminiModelGroup = document.getElementById('gemini-model-group');
    const geminiModelSelect = document.getElementById('gemini-model');
    
    const openrouterModelGroup = document.getElementById('openrouter-model-group');
    const openrouterModelInput = document.getElementById('openrouter-model');
    
    const enableHeaderCheckbox = document.getElementById('enable-header-checkbox');
    
    const fileUsageInput = document.getElementById('file-usage');
    const dropZoneUsage = document.getElementById('drop-zone-usage');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    
    const filePricingInput = document.getElementById('file-pricing');
    const dropZonePricing = document.getElementById('drop-zone-pricing');
    const detailsPricing = document.getElementById('details-pricing');
    const removePricingBtn = document.getElementById('remove-pricing');
    
    const customPromptTextarea = document.getElementById('custom-prompt');
    const charCounter = document.getElementById('char-counter');
    const generateBtn = document.getElementById('btn-generate');
    
    // Preview panel elements
    const previewPanel = document.getElementById('preview-panel');
    const previewTabsContainer = document.getElementById('preview-tabs-container');
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
    
    const outputFilenameInput = document.getElementById('output-filename');
    
    // Timeline & Download area
    const timelineBox = document.getElementById('generation-timeline');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    const downloadArea = document.getElementById('download-area');
    const btnDownload = document.getElementById('btn-download');
    
    // State variables
    let reports = []; // elements: { id, file, parsedData, customFilename: '', isParsed: false, error: null }
    let selectedPricingFile = null;
    let activeReportIndex = -1;
    let batchBlob = null; // store zip blob if generated in batch
    
    const monthTranslations = {
        'january': 'Januari', 'february': 'Februari', 'march': 'Maret', 'april': 'April',
        'may': 'Mei', 'june': 'Juni', 'july': 'Juli', 'august': 'Agustus',
        'september': 'September', 'october': 'Oktober', 'november': 'November', 'december': 'Desember',
        'jan': 'Januari', 'feb': 'Februari', 'mar': 'Maret', 'apr': 'April',
        'jun': 'Juni', 'jul': 'Juli', 'aug': 'Agustus', 'sep': 'September',
        'oct': 'Oktober', 'nov': 'November', 'dec': 'Desember'
    };

    function suggestFilename(deptName, period) {
        let monthYear = "Report";
        if (period) {
            const parts = period.split(/\s+/);
            if (parts.length >= 7) {
                let m = parts[5].toLowerCase();
                let y = parts[6];
                let mInd = monthTranslations[m] || parts[5];
                monthYear = `${mInd} ${y}`;
            } else {
                for (let word of parts) {
                    let clean = word.toLowerCase().replace(/[^a-z]/g, '');
                    if (monthTranslations[clean]) {
                        monthYear = monthTranslations[clean];
                    }
                    let num = word.replace(/[^0-9]/g, '');
                    if (num.length === 4) {
                        monthYear += ` ${num}`;
                    }
                }
            }
        }
        const cleanDept = deptName.replace(/[\/\\?%*:|"<>\.]/g, '_');
        return `${cleanDept} Usage Chatbot Report - ${monthYear}`;
    }

    // Load saved settings from localStorage
    function loadSettings() {
        if (localStorage.getItem('use_ai_toggle') !== null) {
            useAiToggle.checked = localStorage.getItem('use_ai_toggle') === 'true';
        }
        toggleAiSectionVisibility();
        
        const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
        providerRadios.forEach(radio => {
            if (radio.value === savedProvider) {
                radio.checked = true;
                updateProviderUI(savedProvider);
            }
        });
        
        if (localStorage.getItem('gemini_api_key')) {
            if (savedProvider === 'gemini') {
                apiKeyInput.value = localStorage.getItem('gemini_api_key');
            }
        }
        if (localStorage.getItem('openrouter_api_key')) {
            if (savedProvider === 'openrouter') {
                apiKeyInput.value = localStorage.getItem('openrouter_api_key');
            }
        }
        if (localStorage.getItem('gemini_model')) {
            geminiModelSelect.value = localStorage.getItem('gemini_model');
        }
        if (localStorage.getItem('openrouter_model')) {
            openrouterModelInput.value = localStorage.getItem('openrouter_model');
        }
    }
    
    loadSettings();

    // Toggle AI Config Visibility
    function toggleAiSectionVisibility() {
        if (useAiToggle.checked) {
            aiConfigSection.style.display = 'flex';
        } else {
            aiConfigSection.style.display = 'none';
        }
        localStorage.setItem('use_ai_toggle', useAiToggle.checked);
        validateInputs();
    }
    
    useAiToggle.addEventListener('change', toggleAiSectionVisibility);

    // AI Provider Switch handler
    providerRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const provider = e.target.value;
            localStorage.setItem('ai_provider', provider);
            updateProviderUI(provider);
        });
    });

    function updateProviderUI(provider) {
        providerOptions.forEach(opt => {
            const radio = opt.querySelector('input');
            if (radio.value === provider) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

        if (provider === 'gemini') {
            apiKeyLabel.textContent = "Gemini API Key";
            apiKeyInput.placeholder = "Masukkan Gemini API Key";
            apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
            geminiModelGroup.classList.remove('hidden');
            openrouterModelGroup.classList.add('hidden');
        } else {
            apiKeyLabel.textContent = "OpenRouter API Key";
            apiKeyInput.placeholder = "Masukkan OpenRouter API Key";
            apiKeyInput.value = localStorage.getItem('openrouter_api_key') || '';
            geminiModelGroup.classList.add('hidden');
            openrouterModelGroup.classList.remove('hidden');
        }
        validateInputs();
    }

    // Save API key on input change
    apiKeyInput.addEventListener('input', () => {
        const provider = document.querySelector('input[name="ai-provider"]:checked').value;
        if (provider === 'gemini') {
            localStorage.setItem('gemini_api_key', apiKeyInput.value.trim());
        } else {
            localStorage.setItem('openrouter_api_key', apiKeyInput.value.trim());
        }
        validateInputs();
    });

    // Save models choice on input change
    geminiModelSelect.addEventListener('change', () => {
        localStorage.setItem('gemini_model', geminiModelSelect.value);
    });

    openrouterModelInput.addEventListener('input', () => {
        localStorage.setItem('openrouter_model', openrouterModelInput.value.trim());
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
            customPromptTextarea.dispatchEvent(new Event('input')); // trigger character counter
        });
    });

    // Format numbers with thousands separator
    function formatNumber(num) {
        if (num === null || num === undefined) return "-";
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Setup Usage Drag and Drop Zone
    dropZoneUsage.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZoneUsage.classList.add('dragover');
    });

    dropZoneUsage.addEventListener('dragleave', () => {
        dropZoneUsage.classList.remove('dragover');
    });

    dropZoneUsage.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZoneUsage.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleUsageFilesSelection(e.dataTransfer.files);
        }
    });

    dropZoneUsage.addEventListener('click', () => {
        fileUsageInput.click();
    });

    fileUsageInput.addEventListener('change', () => {
        if (fileUsageInput.files.length > 0) {
            handleUsageFilesSelection(fileUsageInput.files);
        }
    });

    // Handle multiple usage Excel files
    function handleUsageFilesSelection(filesList) {
        reports = [];
        uploadedFilesList.innerHTML = '';
        
        // Convert to array and filter out non-xlsx files
        const files = Array.from(filesList).filter(f => f.name.endsWith('.xlsx'));
        
        if (files.length === 0) {
            alert('Silakan unggah file Excel (.xlsx) yang valid.');
            return;
        }

        // Initialize state reports
        files.forEach((file, index) => {
            const report = {
                id: index,
                file: file,
                parsedData: null,
                customFilename: '',
                isParsed: false,
                error: null
            };
            reports.push(report);
            
            // Render UI details card
            const item = document.createElement('div');
            item.className = 'uploaded-file-item';
            item.id = `uploaded-item-${index}`;
            item.innerHTML = `
                <i class="fa-solid fa-file-excel"></i>
                <span class="file-name-span">${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
                <span class="file-status-span" style="margin-right: 0.5rem; font-size: 0.7rem; color: var(--text-muted)">Parsing...</span>
                <button type="button" class="remove-file-item-btn" data-id="${index}"><i class="fa-solid fa-xmark"></i></button>
            `;
            uploadedFilesList.appendChild(item);
        });

        // Setup removal handlers
        uploadedFilesList.querySelectorAll('.remove-file-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                removeReportItem(id);
            });
        });

        // Trigger parallel parses
        triggerExcelParses();
    }

    function removeReportItem(id) {
        reports = reports.filter(r => r.id !== id);
        const item = document.getElementById(`uploaded-item-${id}`);
        if (item) item.remove();
        
        if (reports.length === 0) {
            fileUsageInput.value = '';
            resetPreviewPanel();
        } else {
            // Re-render tab buttons and display first parsed report
            renderTabButtons();
            const firstParsedIdx = reports.findIndex(r => r.isParsed);
            if (firstParsedIdx !== -1) {
                activateTab(firstParsedIdx);
            }
        }
        validateInputs();
    }

    // Parallel parser helper
    function triggerExcelParses() {
        previewPanel.classList.remove('hidden-preview');
        previewPanel.classList.add('show-preview');
        downloadArea.classList.add('hidden');
        timelineBox.classList.add('hidden');
        renderTabButtons();
        
        activeReportIndex = -1;
        setLoadingState(true);

        reports.forEach((report, index) => {
            const formData = new FormData();
            formData.append('usage_file', report.file);
            if (selectedPricingFile) {
                formData.append('pricing_file', selectedPricingFile);
            }

            fetch('/api/parse', {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.error || 'Gagal membaca excel');
                    });
                }
                return res.json();
            })
            .then(data => {
                report.parsedData = data;
                report.customFilename = suggestFilename(data.dept_name, data.period);
                report.isParsed = true;
                
                // Update file item status
                const item = document.getElementById(`uploaded-item-${report.id}`);
                if (item) {
                    item.querySelector('.file-status-span').textContent = 'Ready';
                    item.querySelector('.file-status-span').style.color = 'var(--color-success)';
                }

                // Update tab labels
                const tabBtn = document.getElementById(`tab-btn-${report.id}`);
                if (tabBtn) {
                    tabBtn.textContent = data.dept_name;
                    tabBtn.disabled = false;
                }

                // If no active index is set yet, show this parsed item
                if (activeReportIndex === -1) {
                    setLoadingState(false);
                    activateTab(report.id);
                }
                validateInputs();
            })
            .catch(err => {
                report.error = err.message;
                report.isParsed = false;
                
                const item = document.getElementById(`uploaded-item-${report.id}`);
                if (item) {
                    item.querySelector('.file-status-span').textContent = 'Error';
                    item.querySelector('.file-status-span').style.color = 'var(--color-danger)';
                }
                
                const tabBtn = document.getElementById(`tab-btn-${report.id}`);
                if (tabBtn) {
                    tabBtn.textContent = 'Err';
                    tabBtn.style.color = 'var(--color-danger)';
                }
                
                console.error(`Error parsing index ${index}:`, err);
                validateInputs();
            });
        });
    }

    // Render Preview navigation tab buttons
    function renderTabButtons() {
        previewTabsContainer.innerHTML = '';
        if (reports.length <= 1) {
            previewTabsContainer.classList.add('hidden');
            return;
        }
        
        previewTabsContainer.classList.remove('hidden');
        reports.forEach(report => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tab-btn';
            btn.id = `tab-btn-${report.id}`;
            btn.textContent = report.isParsed ? report.parsedData.dept_name : `Loading File ${report.id + 1}...`;
            btn.disabled = !report.isParsed;
            
            btn.addEventListener('click', () => {
                activateTab(report.id);
            });
            previewTabsContainer.appendChild(btn);
        });
    }

    function activateTab(reportId) {
        const index = reports.findIndex(r => r.id === reportId);
        if (index === -1) return;
        
        activeReportIndex = index;
        const report = reports[index];

        // Toggle buttons class
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.id === `tab-btn-${reportId}`) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (report.isParsed && report.parsedData) {
            populateStats(report.parsedData);
            outputFilenameInput.value = report.customFilename;
        }
    }

    // Track filename custom edits
    outputFilenameInput.addEventListener('input', () => {
        if (activeReportIndex !== -1 && reports[activeReportIndex]) {
            reports[activeReportIndex].customFilename = outputFilenameInput.value.trim();
        }
    });

    // Pricing Upload setup
    function setupPricingUpload() {
        dropZonePricing.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZonePricing.classList.add('dragover');
        });
        dropZonePricing.addEventListener('dragleave', () => {
            dropZonePricing.classList.remove('dragover');
        });
        dropZonePricing.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZonePricing.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.xlsx')) {
                    filePricingInput.files = e.dataTransfer.files;
                    handlePricingSelection(file);
                } else {
                    alert('Hanya mendukung file Excel (.xlsx).');
                }
            }
        });
        dropZonePricing.addEventListener('click', () => {
            filePricingInput.click();
        });
        filePricingInput.addEventListener('change', () => {
            if (filePricingInput.files.length > 0) {
                handlePricingSelection(filePricingInput.files[0]);
            }
        });
        removePricingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filePricingInput.value = '';
            detailsPricing.style.display = 'none';
            dropZonePricing.classList.remove('hidden');
            selectedPricingFile = null;
            if (reports.length > 0) {
                triggerExcelParses();
            }
        });
    }

    setupPricingUpload();

    function handlePricingSelection(file) {
        dropZonePricing.classList.add('hidden');
        detailsPricing.style.display = 'flex';
        detailsPricing.querySelector('.file-name').textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        selectedPricingFile = file;
        if (reports.length > 0) {
            triggerExcelParses();
        }
    }

    // State loaders & validation
    function validateInputs() {
        let isValid = reports.length > 0 && reports.every(r => r.isParsed);
        
        // If AI is toggled on, require API key
        if (useAiToggle.checked) {
            const apiVal = apiKeyInput.value.trim();
            if (!apiVal) {
                isValid = false;
            }
        }
        
        generateBtn.disabled = !isValid;
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
    }

    function populateStats(data) {
        metaDept.textContent = data.dept_name;
        metaPeriod.textContent = data.period;
        metaClient.textContent = data.client_name;
        
        statChat.textContent = formatNumber(data.chat_sessions);
        statBilling.textContent = formatNumber(data.billing_sessions);
        statInput.textContent = formatNumber(data.input_tokens);
        statOutput.textContent = formatNumber(data.output_tokens);
        
        statOverPct.textContent = `${data.over_billing_pct.toFixed(1)}%`;
        statOverCount.textContent = formatNumber(data.over_billing_count);
        chatSessTotal.textContent = formatNumber(data.chat_sessions);
        statAvgBill.textContent = data.avg_billing_per_chat.toFixed(2);
    }

    function resetPreviewPanel() {
        previewPanel.classList.remove('show-preview');
        previewPanel.classList.add('hidden-preview');
        generateBtn.disabled = true;
        downloadArea.classList.add('hidden');
        timelineBox.classList.add('hidden');
        reports = [];
        activeReportIndex = -1;
    }

    // Trigger Docx compilation (ZIP batch vs Single docx)
    generateBtn.addEventListener('click', () => {
        if (reports.length === 0) return;

        // Display progress timeline log
        timelineBox.classList.remove('hidden');
        downloadArea.classList.add('hidden');
        generateBtn.disabled = true;
        
        generateBtn.querySelector('.btn-text').classList.add('hidden');
        generateBtn.querySelector('.btn-spinner').classList.remove('hidden');

        setStepState(step1, 'loading', 'Mengunggah & menganalisis file Excel...');
        setStepState(step2, 'pending', 'Menghubungi Gemini/OpenRouter API...');
        setStepState(step3, 'pending', 'Menyusun layout tabel & kompilasi file DOCX...');

        // Smooth visual transitions
        setTimeout(() => {
            setStepState(step1, 'success', `Semua file Excel (${reports.length} berkas) berhasil diproses.`);
            if (useAiToggle.checked) {
                setStepState(step2, 'loading', 'Menghubungi API Key provider untuk kustomisasi insight...');
            } else {
                setStepState(step2, 'success', 'Analisis LLM dilewati (Menggunakan offline template).');
                setStepState(step3, 'loading', 'Menyusun layout tabel & kompilasi file DOCX...');
            }
        }, 1200);

        const provider = document.querySelector('input[name="ai-provider"]:checked').value;
        const modelName = provider === 'gemini' ? geminiModelSelect.value : openrouterModelInput.value.trim();

        // Check if multiple files or single file
        if (reports.length > 1) {
            // Batch generation
            const formData = new FormData();
            reports.forEach(r => {
                formData.append('usage_files', r.file);
                formData.append('custom_filenames', r.customFilename || r.file.name.replace('.xlsx', '.docx'));
            });
            if (selectedPricingFile) {
                formData.append('pricing_file', selectedPricingFile);
            }
            formData.append('use_ai', useAiToggle.checked);
            formData.append('ai_provider', provider);
            formData.append('api_key', apiKeyInput.value.trim());
            formData.append('model_name', modelName);
            formData.append('custom_prompt', customPromptTextarea.value.trim());
            formData.append('enable_header', enableHeaderCheckbox.checked);

            fetch('/api/generate-batch', {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.error || 'Gagal generate batch');
                    });
                }
                if (useAiToggle.checked) {
                    setStepState(step2, 'success', 'Provider AI berhasil merangkum insight untuk seluruh divisi.');
                }
                setStepState(step3, 'loading', 'Mengemas semua laporan DOCX ke dalam berkas ZIP...');
                return res.blob();
            })
            .then(blob => {
                batchBlob = blob;
                setStepState(step3, 'success', `Sukses! ${reports.length} Laporan DOCX berhasil dikompilasi ke dalam ZIP.`);
                
                // Configure ZIP download link
                const url = window.URL.createObjectURL(blob);
                btnDownload.href = url;
                btnDownload.setAttribute('download', 'sygma_chatbot_reports.zip');
                btnDownload.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Unduh Semua Laporan (.zip)';
                
                downloadArea.classList.remove('hidden');
                
                // Reset button state
                generateBtn.disabled = false;
                generateBtn.querySelector('.btn-text').classList.remove('hidden');
                generateBtn.querySelector('.btn-spinner').classList.add('hidden');
            })
            .catch(err => {
                console.error(err);
                alert(`Gagal membuat dokumen batch: ${err.message}`);
                setErrorStepState(err.message);
                resetGenerateButtonState();
            });
        } else {
            // Single report generation
            const activeReport = reports[0];
            const formData = new FormData();
            formData.append('usage_file', activeReport.file);
            if (selectedPricingFile) {
                formData.append('pricing_file', selectedPricingFile);
            }
            formData.append('use_ai', useAiToggle.checked);
            formData.append('ai_provider', provider);
            formData.append('api_key', apiKeyInput.value.trim());
            formData.append('model_name', modelName);
            formData.append('custom_prompt', customPromptTextarea.value.trim());
            formData.append('enable_header', enableHeaderCheckbox.checked);
            formData.append('custom_filename', activeReport.customFilename);

            fetch('/api/generate', {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.error || 'Gagal generate laporan');
                    });
                }
                if (useAiToggle.checked) {
                    setStepState(step2, 'success', 'Provider AI berhasil merangkum cover letter & insight.');
                }
                setStepState(step3, 'loading', 'Menyusun berkas dokumen Word...');
                return res.blob();
            })
            .then(blob => {
                setStepState(step3, 'success', 'Laporan Word (.docx) berhasil dibuat dengan sempurna.');
                
                const url = window.URL.createObjectURL(blob);
                btnDownload.href = url;
                
                let filename = activeReport.customFilename;
                if (!filename.endsWith('.docx')) filename += '.docx';
                btnDownload.setAttribute('download', filename);
                btnDownload.innerHTML = '<i class="fa-solid fa-download"></i> Unduh Laporan Ini (.docx)';
                
                downloadArea.classList.remove('hidden');
                resetGenerateButtonState();
            })
            .catch(err => {
                console.error(err);
                alert(`Gagal memproses dokumen: ${err.message}`);
                setErrorStepState(err.message);
                resetGenerateButtonState();
            });
        }
    });

    function setErrorStepState(message) {
        document.querySelectorAll('.timeline-item').forEach(item => {
            if (item.classList.contains('active') || item.innerHTML.includes('spin')) {
                setStepState(item, 'error', `Gagal: ${message}`);
            }
        });
    }

    function resetGenerateButtonState() {
        generateBtn.disabled = false;
        generateBtn.querySelector('.btn-text').classList.remove('hidden');
        generateBtn.querySelector('.btn-spinner').classList.add('hidden');
    }

    function setStepState(stepElement, state, text) {
        const bullet = stepElement.querySelector('.step-bullet');
        const textNode = stepElement.querySelector('.step-text');
        
        textNode.textContent = text;
        stepElement.className = 'timeline-item';

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
