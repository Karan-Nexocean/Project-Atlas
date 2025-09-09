import React, { useCallback, useEffect, useState } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Spinner } from './Spinner';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isAnalyzing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isAnalyzing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const steps = [
    'Scanning document structure...',
    'Analyzing content quality...',
    'Generating improvement suggestions...'
  ];
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) return;
    setActiveStep(0);
    const id = setInterval(() => {
      setActiveStep((i) => (i + 1 < steps.length ? i + 1 : i));
    }, 1100);
    return () => clearInterval(id);
  }, [isAnalyzing]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
      }
    }
  };

  const isValidFileType = (file: File) => {
    const validTypes = [
      'application/pdf',
      'text/plain'
    ];
    return validTypes.includes(file.type);
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-10 md:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 relative">
            <Spinner size={64} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Analyzing Your Resume</h3>
          <p className="text-slate-600 mb-8">Varuna is examining your resume and preparing actionable insights...</p>

          {/* Smooth indeterminate progress */}
          <div className="progress-track rounded-full mb-8">
            <div className="progress-bar-indeterminate" />
          </div>

          {/* Step timeline */}
          <div className="space-y-3 text-left max-w-md mx-auto">
            {steps.map((step, index) => {
              const complete = index < activeStep;
              const current = index === activeStep;
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${complete ? 'text-slate-700' : current ? 'text-slate-800' : 'text-slate-500'}`}>
                    {complete ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <span className={`inline-block w-2 h-2 rounded-full ${current ? 'bg-v-turquoise animate-pulse' : 'bg-slate-300'}`}></span>
                    )}
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-bold text-slate-800 mb-4">Upload Your Resume</h3>
        <p className="text-slate-600">Upload your resume in PDF or TXT format for AI-powered analysis</p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          dragActive
            ? 'border-v-turquoise bg-v-paper/40'
            : selectedFile
            ? 'border-green-500 bg-green-50'
            : 'border-slate-300 bg-white hover:border-v-turquoise hover:bg-v-paper/60'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <>
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-v-turquoise' : 'text-slate-400'}`} />
            <h4 className="text-xl font-semibold text-slate-700 mb-2">
              Drop your resume here
            </h4>
            <p className="text-slate-500 mb-6">
              or click to browse files
            </p>
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.txt"
              onChange={handleFileChange}
            />
            <div className="flex justify-center space-x-4 text-sm text-slate-400">
              <span>PDF</span>
              <span>•</span>
              <span>TXT</span>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-semibold text-slate-700">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={removeFile}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleAnalyze}
              className="w-full btn-gradient text-white py-4 px-8 rounded-xl font-semibold text-lg hover:opacity-95 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Analyze with Varuna
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm text-slate-500">
        <div>ATS Compatibility</div>
        <div>Industry Standards</div>
        <div>Keyword Optimization</div>
        <div>Actionable Insights</div>
      </div>
    </div>
  );
};
