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
    const resetBtn = document.getElementById('btn-reset');
    
    // Preview panel elements
    const previewPanel = document.getElementById('preview-panel');
    const previewTabsContainer = document.getElementById('preview-tabs-container');
    const outputFilenameInput = document.getElementById('output-filename');
    
    // Preview toolbar and zoom controls
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomReset = document.getElementById('btn-zoom-reset');
    const zoomLevelText = document.getElementById('zoom-level-text');
    
    const btnDownloadSingle = document.getElementById('btn-download-single');
    const btnDownloadAllZip = document.getElementById('btn-download-all-zip');
    
    const documentPage = document.getElementById('document-page');
    const documentPreviewWrapper = document.getElementById('document-preview-wrapper');
    
    // Timeline & Download area
    const timelineBox = document.getElementById('generation-timeline');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');
    
    // State variables
    let reports = []; // elements: { id, file, parsedData, customFilename: '', isParsed: false, error: null, blob: null, aiContent: null }
    let selectedPricingFile = null;
    let activeReportIndex = -1;
    let batchBlob = null; // store zip blob if generated in batch
    let zoomLevel = 1.0;
    
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
                error: null,
                blob: null,
                aiContent: null
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
                activateTab(reports[firstParsedIdx].id);
            }
        }
        validateInputs();
    }

    // Parallel parser helper
    function triggerExcelParses() {
        previewPanel.classList.remove('hidden-preview');
        previewPanel.classList.add('show-preview');
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
            btnDownloadAllZip.classList.add('hidden');
            return;
        }
        
        previewTabsContainer.classList.remove('hidden');
        btnDownloadAllZip.classList.remove('hidden');
        
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
            outputFilenameInput.value = report.customFilename;
            updateDocumentPreview();
            btnDownloadSingle.disabled = false;
        }
    }

    // Track filename custom edits and update A4 page title
    outputFilenameInput.addEventListener('input', () => {
        if (activeReportIndex !== -1 && reports[activeReportIndex]) {
            reports[activeReportIndex].customFilename = outputFilenameInput.value.trim();
        }
    });

    enableHeaderCheckbox.addEventListener('change', () => {
        if (activeReportIndex !== -1) {
            updateDocumentPreview();
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
        if (isLoading) {
            documentPage.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; color: var(--text-secondary);">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: var(--color-primary); margin-bottom: 1rem;"></i>
                    <span style="font-weight: 500;">Menganalisis file Excel...</span>
                </div>
            `;
        }
    }

    function resetPreviewPanel() {
        previewPanel.classList.remove('show-preview');
        previewPanel.classList.add('hidden-preview');
        generateBtn.disabled = true;
        timelineBox.classList.add('hidden');
        reports = [];
        activeReportIndex = -1;
        batchBlob = null;
        zoomLevel = 1.0;
        applyZoom();
        documentPage.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                Menunggu unggahan file Excel...
            </div>
        `;
        btnDownloadSingle.disabled = true;
        btnDownloadAllZip.classList.add('hidden');
    }

    // Zoom Controls Implementation
    function applyZoom() {
        if (!documentPage) return;
        if ('zoom' in documentPage.style) {
            documentPage.style.zoom = zoomLevel;
            documentPage.style.transform = '';
            documentPage.style.margin = '0 auto';
        } else {
            // Firefox transform scaling fallback
            documentPage.style.transform = `scale(${zoomLevel})`;
            documentPage.style.transformOrigin = 'top center';
            const heightDiff = (zoomLevel - 1) * 1118;
            documentPage.style.marginBottom = `${heightDiff}px`;
        }
        zoomLevelText.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
    
    btnZoomIn.addEventListener('click', () => {
        if (zoomLevel < 1.8) {
            zoomLevel += 0.1;
            applyZoom();
        }
    });
    
    btnZoomOut.addEventListener('click', () => {
        if (zoomLevel > 0.5) {
            zoomLevel -= 0.1;
            applyZoom();
        }
    });
    
    btnZoomReset.addEventListener('click', () => {
        zoomLevel = 1.0;
        applyZoom();
    });

    // Trigger Docx compilation (ZIP batch vs Single docx)
    generateBtn.addEventListener('click', () => {
        if (reports.length === 0) return;

        // Display progress timeline log
        timelineBox.classList.remove('hidden');
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
        }, 1000);

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
                
                // Parse the serialized AI contents header
                const aiHeader = res.headers.get('X-AI-Content');
                if (aiHeader) {
                    try {
                        const allAiContent = JSON.parse(aiHeader);
                        allAiContent.forEach((content, idx) => {
                            if (reports[idx]) {
                                reports[idx].aiContent = content;
                            }
                        });
                    } catch (e) {
                        console.error('Error parsing AI content header:', e);
                    }
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
                
                // Expose collective ZIP button
                btnDownloadAllZip.classList.remove('hidden');
                
                // Refresh A4 preview of active report with AI details
                updateDocumentPreview();
                
                resetGenerateButtonState();
                
                // Automatically download the batch ZIP
                btnDownloadAllZip.click();
            })
            .catch(err => {
                console.error(err);
                alert(`Gagal membuat dokumen batch:\n${err.message}`);
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
                
                // Parse custom header
                const aiHeader = res.headers.get('X-AI-Content');
                if (aiHeader) {
                    try {
                        activeReport.aiContent = JSON.parse(aiHeader);
                    } catch (e) {
                        console.error('Error parsing AI content header:', e);
                    }
                }
                
                if (useAiToggle.checked) {
                    setStepState(step2, 'success', 'Provider AI berhasil merangkum cover letter & insight.');
                }
                setStepState(step3, 'loading', 'Menyusun berkas dokumen Word...');
                return res.blob();
            })
            .then(blob => {
                activeReport.blob = blob;
                setStepState(step3, 'success', 'Laporan Word (.docx) berhasil dibuat dengan sempurna.');
                
                // Refresh preview with AI insights
                updateDocumentPreview();
                
                // Trigger download
                btnDownloadSingle.disabled = false;
                btnDownloadSingle.click();
                
                resetGenerateButtonState();
            })
            .catch(err => {
                console.error(err);
                alert(`Gagal memproses dokumen:\n${err.message}`);
                setErrorStepState(err.message);
                resetGenerateButtonState();
            });
        }
    });

    // Individual "Unduh DOCX" Button handler
    btnDownloadSingle.addEventListener('click', () => {
        if (activeReportIndex === -1) return;
        const report = reports[activeReportIndex];
        if (!report || !report.isParsed) return;
        
        // If blob is already generated in state, trigger direct download
        if (report.blob) {
            triggerFileDownload(report.blob, report.customFilename);
            return;
        }
        
        // Else, generate the single report on the fly (offline fallback or with AI parameters)
        btnDownloadSingle.disabled = true;
        btnDownloadSingle.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Downloading...';
        
        const provider = document.querySelector('input[name="ai-provider"]:checked').value;
        const modelName = provider === 'gemini' ? geminiModelSelect.value : openrouterModelInput.value.trim();
        
        const formData = new FormData();
        formData.append('usage_file', report.file);
        if (selectedPricingFile) {
            formData.append('pricing_file', selectedPricingFile);
        }
        formData.append('use_ai', useAiToggle.checked);
        formData.append('ai_provider', provider);
        formData.append('api_key', apiKeyInput.value.trim());
        formData.append('model_name', modelName);
        formData.append('custom_prompt', customPromptTextarea.value.trim());
        formData.append('enable_header', enableHeaderCheckbox.checked);
        formData.append('custom_filename', report.customFilename);

        fetch('/api/generate', {
            method: 'POST',
            body: formData
        })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => {
                    throw new Error(err.error || 'Gagal download docx');
                });
            }
            // Parse headers if AI ran
            const aiHeader = res.headers.get('X-AI-Content');
            if (aiHeader) {
                try {
                    report.aiContent = JSON.parse(aiHeader);
                } catch (e) {
                    console.error('Error parsing AI content header:', e);
                }
            }
            return res.blob();
        })
        .then(blob => {
            report.blob = blob;
            updateDocumentPreview();
            triggerFileDownload(blob, report.customFilename);
            btnDownloadSingle.disabled = false;
            btnDownloadSingle.innerHTML = '<i class="fa-solid fa-download"></i> Unduh DOCX';
        })
        .catch(err => {
            btnDownloadSingle.disabled = false;
            btnDownloadSingle.innerHTML = '<i class="fa-solid fa-download"></i> Unduh DOCX';
            alert(`Gagal download docx:\n${err.message}`);
        });
    });

    // ZIP Download Button handler
    btnDownloadAllZip.addEventListener('click', () => {
        if (batchBlob) {
            triggerFileDownload(batchBlob, 'sygma_chatbot_reports.zip');
        } else {
            alert('Silakan klik tombol "Generate Laporan" terlebih dahulu untuk membuat berkas ZIP.');
        }
    });

    // General download trigger helper
    function triggerFileDownload(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        let dlName = filename;
        if (!dlName.endsWith('.docx') && !dlName.endsWith('.zip')) {
            dlName += '.docx';
        }
        
        a.setAttribute('download', dlName);
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

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

    // Reset all files and preview data
    resetBtn.addEventListener('click', () => {
        fileUsageInput.value = '';
        filePricingInput.value = '';
        
        // Clear pricing UI
        detailsPricing.style.display = 'none';
        dropZonePricing.classList.remove('hidden');
        
        // Clear uploaded files list
        uploadedFilesList.innerHTML = '';
        
        // Reset state
        reports = [];
        selectedPricingFile = null;
        activeReportIndex = -1;
        batchBlob = null;
        
        // Reset custom prompt
        customPromptTextarea.value = '';
        charCounter.textContent = '0 / 500 karakter';
        
        // Reset preview
        resetPreviewPanel();
        
        // Validate inputs (disables generate button)
        validateInputs();
    });

    // Simulated A4 page renderer
    function updateDocumentPreview() {
        if (!documentPage || activeReportIndex === -1) return;
        
        const report = reports[activeReportIndex];
        if (!report || !report.isParsed || !report.parsedData) {
            documentPage.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Menunggu data file Excel...</div>';
            return;
        }
        
        const data = report.parsedData;
        const enableHeader = enableHeaderCheckbox.checked;
        
        // Get introduction and insights (either AI-generated or fallback)
        const introduction = report.aiContent ? report.aiContent.introduction : getOfflineFallbackIntro(data);
        const insights = report.aiContent ? report.aiContent.insights : getOfflineFallbackInsights(data);
        
        let headerHtml = '';
        if (enableHeader) {
            headerHtml = `
                <div class="doc-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1f4e79; padding-bottom: 10px; margin-bottom: 15px;">
                    <div style="font-family: 'Arial', sans-serif; font-size: 16pt; font-weight: bold; color: #f1c40f; letter-spacing: 1px;">ADIRA FINANCE</div>
                    <div style="font-family: 'Arial', sans-serif; font-size: 8pt; color: #1f4e79; text-align: right; font-weight: bold; line-height: 1.2;">
                        PT ADIRA DINAMIKA MULTI FINANCE TBK<br>
                        <span style="font-weight: normal; color: #555;">Gedung Landmark Tower A, Jakarta</span>
                    </div>
                </div>
            `;
        }
        
        // Period mapping to Month Year
        const parts = data.period.split(/\s+/);
        let monthYear = "Report";
        if (parts.length >= 7) {
            let m = parts[5].toLowerCase();
            let y = parts[6];
            let mInd = monthTranslations[m] || parts[5];
            monthYear = `${mInd} ${y}`;
        }
        
        // Format dates simple id
        const today = new Date();
        const monthsIdList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const todayStr = `${today.getDate()} ${monthsIdList[today.getMonth()]} ${today.getFullYear()}`;
        
        // Build metadata table
        const metaTableHtml = `
            <table class="doc-meta-table">
                <tr>
                    <td style="width: 20%; font-weight: bold;">Bulan Laporan</td>
                    <td style="width: 40%;">: ${monthYear}</td>
                    <td style="width: 15%; font-weight: bold;">Tanggal</td>
                    <td style="width: 25%;">: ${todayStr}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Perihal</td>
                    <td>: Laporan Ringkasan Penggunaan AI Chatbot ${data.dept_name}</td>
                    <td style="font-weight: bold;">Kepada</td>
                    <td>: Yth. Tim ${data.dept_name}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Periode</td>
                    <td>: ${data.period}</td>
                    <td></td>
                    <td>: ${data.client_name}</td>
                </tr>
            </table>
        `;
        
        // Section 1 Table Rows
        const usageRowsHtml = `
            <table class="doc-data-table">
                <thead>
                    <tr>
                        <th style="width: 30%;">Parameter Penggunaan</th>
                        <th style="width: 20%;">Jumlah / Volume</th>
                        <th style="width: 50%;">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight: bold;">Chat Sessions</td>
                        <td style="text-align: center;">${formatNumber(data.chat_sessions)}</td>
                        <td>Sesi percakapan unik yang diinisiasi oleh pengguna.</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">Billing Sessions</td>
                        <td style="text-align: center;">${formatNumber(data.billing_sessions)}</td>
                        <td>Sesi billing percakapan.</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">Total Input Tokens</td>
                        <td style="text-align: center;">${formatNumber(data.input_tokens)}</td>
                        <td>Jumlah token input yang dikirim ke model AI.</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">Total Output Tokens</td>
                        <td style="text-align: center;">${formatNumber(data.output_tokens)}</td>
                        <td>Jumlah token output yang dihasilkan oleh model AI.</td>
                    </tr>
                </tbody>
            </table>
        `;
        
        // Section 2 Table Rows (LLM Limits)
        let llmLimitsHtml = '';
        if (data.pricing_rules && data.pricing_rules.length > 0) {
            let rowsHtml = '';
            data.pricing_rules.forEach(rule => {
                rowsHtml += `
                    <tr>
                        <td style="font-weight: bold;">${rule.model || '-'}</td>
                        <td style="text-align: center;">${rule.window || '-'}</td>
                        <td style="text-align: right;">${formatNumber(rule.input)}</td>
                        <td style="text-align: right;">${formatNumber(rule.output)}</td>
                    </tr>
                `;
            });
            llmLimitsHtml = `
                <table class="doc-data-table">
                    <thead>
                        <tr>
                            <th style="width: 40%;">Model AI (Plan)</th>
                            <th style="width: 20%;">Durasi Sesi</th>
                            <th style="width: 20%;">Limit Input</th>
                            <th style="width: 20%;">Limit Output</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            `;
        }
        
        // Section 3 Over-billing stats
        const pctTime = data.over_billing_count ? (data.count_time / data.over_billing_count * 100).toFixed(1) : '0.0';
        const pctOutput = data.over_billing_count ? (data.count_output / data.over_billing_count * 100).toFixed(1) : '0.0';
        const pctBoth = data.over_billing_count ? (data.count_both / data.over_billing_count * 100).toFixed(1) : '0.0';
        
        const overBillingTableHtml = `
            <table class="doc-data-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Faktor Penyebab Over-billing</th>
                        <th style="width: 25%;">Jumlah Sesi Chat</th>
                        <th style="width: 25%;">Persentase (%)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Batas Waktu Sesi Terlampaui</td>
                        <td style="text-align: center;">${formatNumber(data.count_time)}</td>
                        <td style="text-align: center;">${pctTime}%</td>
                    </tr>
                    <tr>
                        <td>Limit Token Output Terlampaui</td>
                        <td style="text-align: center;">${formatNumber(data.count_output)}</td>
                        <td style="text-align: center;">${pctOutput}%</td>
                    </tr>
                    <tr>
                        <td>Kombinasi Waktu & Token Terlampaui</td>
                        <td style="text-align: center;">${formatNumber(data.count_both)}</td>
                        <td style="text-align: center;">${pctBoth}%</td>
                    </tr>
                    <tr style="background-color: #EAF2F8; font-weight: bold;">
                        <td>TOTAL SESI OVER-BILLING</td>
                        <td style="text-align: center;">${formatNumber(data.over_billing_count)}</td>
                        <td style="text-align: center;">100.0%</td>
                    </tr>
                </tbody>
            </table>
        `;
        
        // Build insights list items
        let insightsHtml = '';
        insights.forEach(ins => {
            // Remove markdown bullets or numbers if any
            let parsedIns = ins.replace('\n', ' ').trim();
            if (parsedIns.startsWith('* ')) parsedIns = parsedIns.substring(2);
            else if (parsedIns.startsWith('- ')) parsedIns = parsedIns.substring(2);
            else if (/^\d+\.\s/.test(parsedIns)) parsedIns = parsedIns.replace(/^\d+\.\s/, '');
            
            // Parse bold elements inside insights
            const parts = parsedIns.split('**');
            let textIns = '';
            parts.forEach((p, idx) => {
                if (idx % 2 === 1) {
                    textIns += `<strong style="font-weight: bold;">${p}</strong>`;
                } else {
                    textIns += p;
                }
            });
            insightsHtml += `<li class="doc-bullet-item" style="font-size: 10pt; margin-bottom: 6px; line-height: 1.4;">${textIns}</li>`;
        });
        
        // Parse introduction bold elements
        let introText = introduction;
        const introParts = introText.split('**');
        let finalIntro = '';
        introParts.forEach((p, idx) => {
            if (idx % 2 === 1) {
                finalIntro += `<strong style="font-weight: bold;">${p}</strong>`;
            } else {
                finalIntro += p;
            }
        });
        
        // Render A4 page
        documentPage.innerHTML = `
            ${headerHtml}
            <div class="doc-title">LAPORAN RINGKASAN PENGGUNAAN LAYANAN AI CHATBOT</div>
            ${metaTableHtml}
            
            <p style="font-size: 10pt; margin-bottom: 15px; line-height: 1.4;">
                <strong style="font-weight: bold;">Dengan hormat,</strong><br><br>${finalIntro}
            </p>
            
            <div class="doc-section-title">1. Ringkasan Volume Penggunaan (Usage Overview)</div>
            ${usageRowsHtml}
            
            <div class="doc-section-title">2. Acuan Batas Plan & Model Layanan AI Chatbot</div>
            ${llmLimitsHtml}
            
            <div class="doc-section-title">3. Ringkasan Analisis Sesi dengan Over-billing</div>
            <p style="font-size: 10pt; margin-bottom: 10px; line-height: 1.4;">
                Secara default, satu Chat Session dihitung sebagai satu Billing Session. Namun, sesi billing dapat bertambah (over-billing) apabila percakapan melebihi batas waktu sesi atau akumulasi token output menyentuh kapasitas model plan. Dari total <strong>${formatNumber(data.chat_sessions)} sesi</strong> percakapan unik, terdapat <strong>${formatNumber(data.over_billing_count)} sesi</strong> (${data.over_billing_pct.toFixed(1)}%) yang mengalami over-billing. Berikut adalah ringkasan penyebab over-billing:
            </p>
            ${overBillingTableHtml}
            
            <div class="doc-section-title">4. Ringkasan Analisis & Insight Penggunaan</div>
            <ul class="doc-bullet-list" style="margin-left: 20px; margin-bottom: 15px; list-style-type: disc;">
                ${insightsHtml}
            </ul>
            
            <div class="doc-section-title">5. Keterangan Lampiran</div>
            <p style="font-size: 9.5pt; color: #555; line-height: 1.4; margin-bottom: 25px;">
                1. Lampiran I (Chat Session): Histori chat lengkap per sesi percakapan unik.<br>
                2. Lampiran II (Billing Session): Log detail per billing window interval untuk audit kepatuhan biaya.
            </p>
            
            <!-- Sign-off layout -->
            <table style="width: 100%; font-size: 9.5pt; margin-top: 30px; border-collapse: collapse; border: none;">
                <tr style="border: none;">
                    <td style="width: 50%; border: none; padding: 0;">
                        Disetujui oleh,<br>
                        <strong>PT Adira Dinamika Multi Finance Tbk</strong>
                        <br><br><br><br>
                        ___________________________<br>
                        <strong>Head of Division / Department</strong>
                    </td>
                    <td style="width: 50%; border: none; padding: 0; text-align: right;">
                        Dipersiapkan oleh,<br>
                        <strong>PT Cakra Tekno Nusantara</strong>
                        <br><br><br><br>
                        ___________________________<br>
                        <strong>SYGMA AI Support Team</strong>
                    </td>
                </tr>
            </table>
        `;
    }

    function getOfflineFallbackIntro(data) {
        return `Merujuk pada implementasi layanan AI Chatbot pada aplikasi SYGMA, bersama ini kami sampaikan laporan ringkasan penggunaan layanan untuk divisi **${data.dept_name}** pada periode **${data.period}**. Laporan ini merupakan ikhtisar volume penggunaan, aktivitas interaksi chatbot, serta analisis detail billing session.`;
    }

    function getOfflineFallbackInsights(data) {
        const sorted_over = [...(data.over_billing_list || [])].sort((a,b) => b.bills_count - a.bills_count);
        let longest_sessions_parts = [];
        for (let i = 0; i < Math.min(3, sorted_over.length); i++) {
            longest_sessions_parts.push(`UUID ${sorted_over[i].uuid.substring(0,8)}... (${sorted_over[i].bills_count} Billing Sessions)`);
        }
        const longest_sessions_str = longest_sessions_parts.length > 0 ? longest_sessions_parts.join(', ') : '-';
        
        return [
            `Rata-rata Billing Session per Chat Session di divisi **${data.dept_name}** adalah **${data.avg_billing_per_chat.toFixed(2)} sesi**. Hal ini menandakan pola penggunaan interaktif dengan durasi percakapan melampaui batas awal sesi dasar.`,
            `Sesi dengan over-billing terbanyak terjadi pada: **${longest_sessions_str}**. Hal ini menandakan adanya sesi konsultasi intensif berdurasi sangat panjang atau melampaui batas limit token output berulang kali.`
        ];
    }
});
