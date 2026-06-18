document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const enableHeaderCheckbox = document.getElementById('enable-header-checkbox');
    
    const fileUsageInput = document.getElementById('file-usage');
    const dropZoneUsage = document.getElementById('drop-zone-usage');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    
    const filePricingInput = document.getElementById('file-pricing');
    const dropZonePricing = document.getElementById('drop-zone-pricing');
    const detailsPricing = document.getElementById('details-pricing');
    const removePricingBtn = document.getElementById('remove-pricing');
    
    const resetBtn = document.getElementById('btn-reset');
    
    // Preview panel elements
    const previewPanel = document.getElementById('preview-panel');
    const previewTabsContainer = document.getElementById('preview-tabs-container');
    const outputFilenameInput = document.getElementById('output-filename');
    
    // Stats & metadata elements
    const metaDept = document.getElementById('meta-dept');
    const metaPeriod = document.getElementById('meta-period');
    const metaClient = document.getElementById('meta-client');
    const statChat = document.getElementById('stat-chat');
    const statBilling = document.getElementById('stat-billing');
    const statInput = document.getElementById('stat-input');
    const statOutput = document.getElementById('stat-output');
    const statOverPct = document.getElementById('stat-over-pct');
    const statOverCount = document.getElementById('stat-over-count');
    const statAvgBill = document.getElementById('stat-avg-bill');
    
    const btnDownloadSingle = document.getElementById('btn-download-single');
    const btnDownloadAllZip = document.getElementById('btn-download-all-zip');
    
    // Timeline & Download area
    const timelineBox = document.getElementById('generation-timeline');
    const step1 = document.getElementById('step-1');
    const step3 = document.getElementById('step-3');
    
    // State variables
    let reports = []; // elements: { id, file, parsedData, customFilename: '', isParsed: false, error: null, blob: null }
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

                // Check if all files have finished parsing
                const allDone = reports.every(r => r.isParsed || r.error !== null);
                if (allDone) {
                    const anyParsed = reports.some(r => r.isParsed);
                    if (anyParsed) {
                        triggerReportGeneration();
                    }
                }
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

                // Check if all files have finished parsing
                const allDone = reports.every(r => r.isParsed || r.error !== null);
                if (allDone) {
                    const anyParsed = reports.some(r => r.isParsed);
                    if (anyParsed) {
                        triggerReportGeneration();
                    }
                }
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

    // Track filename custom edits and invalidate cached blobs
    outputFilenameInput.addEventListener('input', () => {
        if (activeReportIndex !== -1 && reports[activeReportIndex]) {
            reports[activeReportIndex].customFilename = outputFilenameInput.value.trim();
            reports[activeReportIndex].blob = null; // invalidate compiled report
            batchBlob = null; // invalidate compiled zip
        }
    });

    enableHeaderCheckbox.addEventListener('change', () => {
        reports.forEach(r => r.blob = null);
        batchBlob = null;
        if (reports.length > 0) {
            triggerReportGeneration();
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
        // Automatic immediate processing, no manual validate buttons needed
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            metaDept.textContent = 'Loading...';
            metaPeriod.textContent = 'Loading...';
            metaClient.textContent = 'Loading...';
        }
    }

    function resetPreviewPanel() {
        previewPanel.classList.remove('show-preview');
        previewPanel.classList.add('hidden-preview');
        timelineBox.classList.add('hidden');
        reports = [];
        activeReportIndex = -1;
        batchBlob = null;
        
        metaDept.textContent = '-';
        metaPeriod.textContent = '-';
        metaClient.textContent = '-';
        statChat.textContent = '0';
        statBilling.textContent = '0';
        statInput.textContent = '0';
        statOutput.textContent = '0';
        statOverPct.textContent = '0%';
        statOverCount.textContent = '0';
        statAvgBill.textContent = '0.0';
        
        btnDownloadSingle.disabled = true;
        btnDownloadAllZip.classList.add('hidden');
    }

    // Trigger Docx compilation (ZIP batch vs Single docx) automatically
    function triggerReportGeneration() {
        if (reports.length === 0) return;

        // Display progress timeline log
        timelineBox.classList.remove('hidden');
        
        // Hide/disable download buttons while compiling
        btnDownloadSingle.disabled = true;
        btnDownloadAllZip.classList.add('hidden');

        setStepState(step1, 'loading', 'Mengunggah & menganalisis file Excel...');
        setStepState(step3, 'pending', 'Menyusun layout tabel & kompilasi file DOCX...');

        // Smooth visual transitions
        setTimeout(() => {
            setStepState(step1, 'success', `Semua file Excel (${reports.length} berkas) berhasil diproses.`);
            setStepState(step3, 'loading', 'Menyusun layout tabel & kompilasi file DOCX...');
        }, 1000);

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
                return res.blob();
            })
            .then(blob => {
                batchBlob = blob;
                setStepState(step3, 'success', `Sukses! ${reports.length} Laporan DOCX berhasil dikompilasi ke dalam ZIP.`);
                
                // Expose collective ZIP button
                btnDownloadAllZip.classList.remove('hidden');
                
                // Mark reports compiled
                reports.forEach(r => {
                    r.blob = new Blob(["Compiled in batch"], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
                });
                
                updateDocumentPreview();
            })
            .catch(err => {
                console.error(err);
                alert(`Gagal membuat dokumen batch:\n${err.message}`);
                setErrorStepState(err.message);
            });
        } else {
            // Single report generation
            const activeReport = reports[0];
            const formData = new FormData();
            formData.append('usage_file', activeReport.file);
            if (selectedPricingFile) {
                formData.append('pricing_file', selectedPricingFile);
            }
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
                return res.blob();
            })
            .then(blob => {
                activeReport.blob = blob;
                setStepState(step3, 'success', 'Laporan Word (.docx) berhasil dibuat dengan sempurna.');
                
                // Refresh preview
                updateDocumentPreview();
            })
            .catch(err => {
                console.error(err);
                alert(`Gagal memproses dokumen:\n${err.message}`);
                setErrorStepState(err.message);
            });
        }
    }

    // Individual "Unduh DOCX" Button handler
    btnDownloadSingle.addEventListener('click', () => {
        if (activeReportIndex === -1) return;
        const report = reports[activeReportIndex];
        if (!report || !report.isParsed) return;
        
        // If blob is already generated in state, trigger direct download
        if (report.blob && report.blob.size > 100) {
            triggerFileDownload(report.blob, report.customFilename);
            return;
        }
        
        // Else, generate the single report on the fly
        btnDownloadSingle.disabled = true;
        btnDownloadSingle.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Downloading...';
        
        const formData = new FormData();
        formData.append('usage_file', report.file);
        if (selectedPricingFile) {
            formData.append('pricing_file', selectedPricingFile);
        }
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
            // Compile on the fly
            btnDownloadAllZip.disabled = true;
            btnDownloadAllZip.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Downloading ZIP...';
            
            const formData = new FormData();
            reports.forEach(r => {
                formData.append('usage_files', r.file);
                formData.append('custom_filenames', r.customFilename || r.file.name.replace('.xlsx', '.docx'));
            });
            if (selectedPricingFile) {
                formData.append('pricing_file', selectedPricingFile);
            }
            formData.append('enable_header', enableHeaderCheckbox.checked);

            fetch('/api/generate-batch', {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => {
                        throw new Error(err.error || 'Gagal download ZIP');
                    });
                }
                return res.blob();
            })
            .then(blob => {
                batchBlob = blob;
                triggerFileDownload(blob, 'sygma_chatbot_reports.zip');
                btnDownloadAllZip.disabled = false;
                btnDownloadAllZip.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Unduh Semua (ZIP)';
            })
            .catch(err => {
                btnDownloadAllZip.disabled = false;
                btnDownloadAllZip.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Unduh Semua (ZIP)';
                alert(`Gagal download ZIP:\n${err.message}`);
            });
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
        
        // Reset preview
        resetPreviewPanel();
        
        // Validate inputs (disables generate button)
        validateInputs();
    });

    // Update stats preview layout
    function updateDocumentPreview() {
        if (activeReportIndex === -1) return;
        
        const report = reports[activeReportIndex];
        if (!report || !report.isParsed || !report.parsedData) {
            return;
        }
        
        const data = report.parsedData;
        
        metaDept.textContent = data.dept_name || '-';
        metaPeriod.textContent = data.period || '-';
        metaClient.textContent = data.client_name || '-';
        
        statChat.textContent = formatNumber(data.chat_sessions);
        statBilling.textContent = formatNumber(data.billing_sessions);
        statInput.textContent = formatNumber(data.input_tokens);
        statOutput.textContent = formatNumber(data.output_tokens);
        
        const overPct = data.over_billing_pct || 0;
        statOverPct.textContent = `${overPct.toFixed(1)}%`;
        statOverCount.textContent = formatNumber(data.over_billing_count);
        statAvgBill.textContent = (data.avg_billing_per_chat || 0).toFixed(2);
        
        // Update all elements with class chat-sess-total
        document.querySelectorAll('.chat-sess-total').forEach(el => {
            el.textContent = formatNumber(data.chat_sessions);
        });
        
        // Handle download button state
        if (report.blob) {
            btnDownloadSingle.disabled = false;
        } else {
            btnDownloadSingle.disabled = true;
        }
    }
});
