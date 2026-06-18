import os
import tempfile
from flask import Flask, render_template, request, jsonify, send_file
from utils import parse_usage_excel, generate_gemini_insights, compile_docx

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

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
    api_key = request.form.get('gemini_api_key', '').strip()
    model_name = request.form.get('gemini_model', 'gemini-1.5-flash').strip()
    custom_prompt = request.form.get('custom_prompt', '').strip()
    
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
            
            # 2. Call Gemini API for insights & cover letter
            gemini_res = generate_gemini_insights(api_key, model_name, parsed_data, custom_prompt)
            
            # 3. Create temp output DOCX path
            out_docx_path = os.path.join(tmpdir, "report.docx")
            
            # 4. Compile Word Document
            compile_docx(out_docx_path, parsed_data, gemini_res, DEFAULT_LOGO_PATH)
            
            # 5. Send file back to user
            # format the download filename e.g. usage_chatbot_credit_mei_2026.docx
            dept_slug = parsed_data['dept_name'].lower().replace(" ", "_")
            # Parse period to get month and year
            period_parts = parsed_data['period'].split()
            # typical period: "01 May 2026 – 31 May 2026"
            month_year = "report"
            if len(period_parts) >= 6:
                # index 4 is month, index 5 is year
                month_year = f"{period_parts[4].lower()}_{period_parts[5]}"
            
            download_name = f"usage_chatbot_{dept_slug}_{month_year}.docx"
            
            return send_file(
                out_docx_path,
                as_attachment=True,
                download_name=download_name,
                mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_details = traceback.format_exc()
            return jsonify({'error': f'Gagal memproses laporan: {str(e)}', 'details': error_details}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
