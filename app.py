import os
import tempfile
import zipfile
from flask import Flask, render_template, request, jsonify, send_file
from utils import parse_usage_excel, generate_gemini_insights, generate_openrouter_insights, compile_docx, get_offline_fallback

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # Increase to 32MB to support multiple uploads

# Path to the default pricing file in the workspace
DEFAULT_PRICING_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "LLM_Pricing_and_Token_Limits.xlsx"))
DEFAULT_LOGO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "static", "images", "adira_logo.jpg"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/parse', methods=['POST'])
def parse_files():
    if 'usage_file' not in request.files:
        return jsonify({'error': 'File usage Excel (.xlsx) harus diunggah.'}), 400
        
    usage_file = request.files['usage_file']
    if usage_file.filename == '':
        return jsonify({'error': 'Tidak ada file usage Excel yang dipilih.'}), 400
        
    pricing_file = request.files.get('pricing_file')
    
    # Create temporary directory for files
    with tempfile.TemporaryDirectory() as tmpdir:
        usage_path = os.path.join(tmpdir, "usage.xlsx")
        usage_file.save(usage_path)
        
        pricing_path = DEFAULT_PRICING_PATH
        if pricing_file and pricing_file.filename != '':
            pricing_path = os.path.join(tmpdir, "pricing.xlsx")
            pricing_file.save(pricing_path)
            
        if not os.path.exists(pricing_path):
            pricing_path = None # will fallback in utils.py
            
        try:
            parsed_data = parse_usage_excel(usage_path, pricing_path)
            # Remove detailed over_billing_list from response to keep JSON size smaller
            preview_data = parsed_data.copy()
            if 'over_billing_list' in preview_data:
                del preview_data['over_billing_list']
            return jsonify(preview_data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_details = traceback.format_exc()
            return jsonify({'error': f'Gagal membaca file Excel: {str(e)}', 'details': error_details}), 500

@app.route('/api/generate', methods=['POST'])
def generate_report():
    if 'usage_file' not in request.files:
        return jsonify({'error': 'File usage Excel (.xlsx) harus diunggah.'}), 400
        
    usage_file = request.files['usage_file']
    if usage_file.filename == '':
        return jsonify({'error': 'Tidak ada file usage Excel yang dipilih.'}), 400
        
    pricing_file = request.files.get('pricing_file')
    use_ai = request.form.get('use_ai') == 'true'
    ai_provider = request.form.get('ai_provider', 'gemini').strip()
    api_key = request.form.get('api_key', '').strip()
    model_name = request.form.get('model_name', '').strip()
    custom_prompt = request.form.get('custom_prompt', '').strip()
    enable_header = request.form.get('enable_header') == 'true'
    custom_filename = request.form.get('custom_filename', '').strip()
    
    # Create temporary directory for processing
    with tempfile.TemporaryDirectory() as tmpdir:
        usage_path = os.path.join(tmpdir, "usage.xlsx")
        usage_file.save(usage_path)
        
        pricing_path = DEFAULT_PRICING_PATH
        if pricing_file and pricing_file.filename != '':
            pricing_path = os.path.join(tmpdir, "pricing.xlsx")
            pricing_file.save(pricing_path)
            
        if not os.path.exists(pricing_path):
            pricing_path = None
            
        try:
            # 1. Parse Excel data
            parsed_data = parse_usage_excel(usage_path, pricing_path)
            
            # 2. Get AI or offline fallback insights
            if use_ai and api_key:
                if ai_provider == 'gemini':
                    insights = generate_gemini_insights(api_key, model_name or 'gemini-1.5-flash', parsed_data, custom_prompt)
                elif ai_provider == 'openrouter':
                    insights = generate_openrouter_insights(api_key, model_name or 'google/gemini-2.5-flash', parsed_data, custom_prompt)
                else:
                    insights = get_offline_fallback(parsed_data)
            else:
                insights = get_offline_fallback(parsed_data)
            
            # 3. Create temp output DOCX path
            out_docx_path = os.path.join(tmpdir, "report.docx")
            
            # 4. Compile Word Document
            compile_docx(out_docx_path, parsed_data, insights, DEFAULT_LOGO_PATH, enable_header=enable_header)
            
            # 5. Send file back to user
            if custom_filename:
                download_name = custom_filename
                if not download_name.endswith('.docx'):
                    download_name += '.docx'
            else:
                dept_name = parsed_data['dept_name']
                period_parts = parsed_data['period'].split()
                month_year = "Report"
                if len(period_parts) >= 7:
                    months_id = {
                        "january": "Januari", "february": "Februari", "march": "Maret", "april": "April",
                        "may": "Mei", "june": "Juni", "july": "Juli", "august": "Agustus",
                        "september": "September", "october": "Oktober", "november": "November", "december": "Desember"
                    }
                    m_lower = period_parts[5].lower()
                    m_id = months_id.get(m_lower, period_parts[5])
                    month_year = f"{m_id} {period_parts[6]}"
                download_name = f"{dept_name} Usage Chatbot Report - {month_year}.docx"
            
            import json
            response_file = send_file(
                out_docx_path,
                as_attachment=True,
                download_name=download_name,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response_file.headers['X-AI-Content'] = json.dumps(insights)
            response_file.headers['Access-Control-Expose-Headers'] = 'X-AI-Content'
            return response_file
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_details = traceback.format_exc()
            return jsonify({'error': f'Gagal memproses laporan: {str(e)}', 'details': error_details}), 500

@app.route('/api/generate-batch', methods=['POST'])
def generate_batch():
    if 'usage_files' not in request.files:
        return jsonify({'error': 'Tidak ada file usage Excel yang diunggah.'}), 400
        
    usage_files = request.files.getlist('usage_files')
    if not usage_files or len(usage_files) == 0 or (len(usage_files) == 1 and usage_files[0].filename == ''):
        return jsonify({'error': 'Tidak ada file usage Excel yang dipilih.'}), 400
        
    pricing_file = request.files.get('pricing_file')
    use_ai = request.form.get('use_ai') == 'true'
    ai_provider = request.form.get('ai_provider', 'gemini').strip()
    api_key = request.form.get('api_key', '').strip()
    model_name = request.form.get('model_name', '').strip()
    custom_prompt = request.form.get('custom_prompt', '').strip()
    enable_header = request.form.get('enable_header') == 'true'
    
    custom_filenames = request.form.getlist('custom_filenames')
    
    with tempfile.TemporaryDirectory() as tmpdir:
        pricing_path = DEFAULT_PRICING_PATH
        if pricing_file and pricing_file.filename != '':
            pricing_path = os.path.join(tmpdir, "pricing.xlsx")
            pricing_file.save(pricing_path)
            
        if not os.path.exists(pricing_path):
            pricing_path = None
            
        zip_path = os.path.join(tmpdir, "sygma_chatbot_reports.zip")
        
        batch_insights = []
        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for idx, u_file in enumerate(usage_files):
                    if u_file.filename == '':
                        continue
                        
                    # Save usage file temporarily
                    u_path = os.path.join(tmpdir, f"usage_{idx}.xlsx")
                    u_file.save(u_path)
                    
                    # Parse data
                    parsed_data = parse_usage_excel(u_path, pricing_path)
                    
                    # Get AI or offline insights
                    if use_ai and api_key:
                        if ai_provider == 'gemini':
                            insights = generate_gemini_insights(api_key, model_name or 'gemini-1.5-flash', parsed_data, custom_prompt)
                        elif ai_provider == 'openrouter':
                            insights = generate_openrouter_insights(api_key, model_name or 'google/gemini-2.5-flash', parsed_data, custom_prompt)
                        else:
                            insights = get_offline_fallback(parsed_data)
                    else:
                        insights = get_offline_fallback(parsed_data)
                    
                    batch_insights.append(insights)
                        
                    # Compile DOCX
                    out_docx_path = os.path.join(tmpdir, f"report_{idx}.docx")
                    compile_docx(out_docx_path, parsed_data, insights, DEFAULT_LOGO_PATH, enable_header=enable_header)
                    
                    # Determine filename
                    filename = None
                    if idx < len(custom_filenames) and custom_filenames[idx].strip():
                        filename = custom_filenames[idx].strip()
                        if not filename.endswith('.docx'):
                            filename += '.docx'
                    else:
                        # automatic naming fallback
                        dept_name = parsed_data['dept_name']
                        period_parts = parsed_data['period'].split()
                        month_year = "Report"
                        if len(period_parts) >= 7:
                            months_id = {
                                "january": "Januari", "february": "Februari", "march": "Maret", "april": "April",
                                "may": "Mei", "june": "Juni", "july": "Juli", "august": "Agustus",
                                "september": "September", "october": "Oktober", "november": "November", "december": "Desember"
                            }
                            m_lower = period_parts[5].lower()
                            m_id = months_id.get(m_lower, period_parts[5])
                            month_year = f"{m_id} {period_parts[6]}"
                        filename = f"{dept_name} Usage Chatbot Report - {month_year}.docx"
                        
                    zipf.write(out_docx_path, arcname=filename)
                    
            import json
            response_file = send_file(
                zip_path,
                as_attachment=True,
                download_name="sygma_chatbot_reports.zip",
                mimetype='application/zip'
            )
            response_file.headers['X-AI-Content'] = json.dumps(batch_insights)
            response_file.headers['Access-Control-Expose-Headers'] = 'X-AI-Content'
            return response_file
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_details = traceback.format_exc()
            return jsonify({'error': f'Gagal memproses batch laporan: {str(e)}', 'details': error_details}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
