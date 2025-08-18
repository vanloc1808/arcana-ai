'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    HelpCircle,
    Upload,
    X,
    Send,
    FileText,
    Image,
    Video,
    Paperclip
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SupportFormData {
    title: string;
    description: string;
    files: File[];
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv',
    '.pdf', '.doc', '.docx', '.txt', '.rtf',
    '.zip', '.rar', '.7z'
];

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
    const [formData, setFormData] = useState<SupportFormData>({
        title: '',
        description: '',
        files: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successTicketId, setSuccessTicketId] = useState<string>('');

    const getFileIcon = (fileName: string) => {
        const ext = fileName.toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) {
            // eslint-disable-next-line jsx-a11y/alt-text
            return <Image className="h-4 w-4" />;
        }
        if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'].includes(ext || '')) {
            return <Video className="h-4 w-4" />;
        }
        if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
            return <FileText className="h-4 w-4" />;
        }
        return <Paperclip className="h-4 w-4" />;
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const validateFile = (file: File): string | null => {
        const fileExt = '.' + file.name.toLowerCase().split('.').pop();

        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
            return `File type ${fileExt} is not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`;
        }

        if (file.size > MAX_FILE_SIZE) {
            return `File "${file.name}" is too large. Maximum size is 25MB.`;
        }

        return null;
    };

    const handleFileSelect = useCallback((newFiles: FileList | File[]) => {
        const filesArray = Array.from(newFiles);
        const validFiles: File[] = [];
        const errors: string[] = [];

        if (formData.files.length + filesArray.length > MAX_FILES) {
            errors.push(`Maximum ${MAX_FILES} files allowed. You can add ${MAX_FILES - formData.files.length} more files.`);
            return;
        }

        for (const file of filesArray) {
            if (formData.files.some(f => f.name === file.name && f.size === file.size)) {
                errors.push(`File "${file.name}" is already selected.`);
                continue;
            }

            const validationError = validateFile(file);
            if (validationError) {
                errors.push(validationError);
                continue;
            }

            validFiles.push(file);
        }

        if (errors.length > 0) {
            toast.error(errors.join('\n'));
        }

        if (validFiles.length > 0) {
            setFormData(prev => ({
                ...prev,
                files: [...prev.files, ...validFiles]
            }));
            toast.success(`${validFiles.length} file(s) added successfully.`);
        }
    }, [formData.files]);

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

        if (e.dataTransfer.files) {
            handleFileSelect(e.dataTransfer.files);
        }
    }, [handleFileSelect]);

    const removeFile = (index: number) => {
        setFormData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Please enter a title for your support request.');
            return;
        }

        if (!formData.description.trim()) {
            toast.error('Please enter a description of your issue.');
            return;
        }

        if (formData.title.length > 200) {
            toast.error('Title must be 200 characters or less.');
            return;
        }

        if (formData.description.length > 2000) {
            toast.error('Description must be 2000 characters or less.');
            return;
        }

        setIsSubmitting(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title.trim());
            formDataToSend.append('description', formData.description.trim());

            formData.files.forEach((file) => {
                formDataToSend.append('files', file);
            });

            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend-arcanaai.nguyenvanloc.com'}/support/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formDataToSend,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to submit support request');
            }

            const result = await response.json();

            setSuccessTicketId(result.ticket_id || 'Unknown');
            setShowSuccessModal(true);

            setFormData({
                title: '',
                description: '',
                files: []
            });

        } catch (error) {
            console.error('Support submission error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to submit support request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({
                title: '',
                description: '',
                files: []
            });
            onClose();
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        setSuccessTicketId('');
        onClose();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto bg-gray-900 border-purple-700">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-xl md:text-2xl font-bold text-center bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            <div className="flex items-center justify-center space-x-2">
                                <HelpCircle className="h-6 w-6 md:h-7 md:w-7 text-purple-500" />
                                <span>Contact Support</span>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="text-center text-gray-300">
                            Need help? Submit a support request and our team will assist you as soon as possible.
                        </DialogDescription>
                    </DialogHeader>

                    <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-medium text-gray-200">
                                        Subject *
                                    </Label>
                                    <Input
                                        id="title"
                                        type="text"
                                        placeholder="Brief description of your issue..."
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
                                        maxLength={200}
                                        disabled={isSubmitting}
                                    />
                                    <div className="text-xs text-gray-400 text-right">
                                        {formData.title.length}/200 characters
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-sm font-medium text-gray-200">
                                        Description *
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Provide detailed information about your issue..."
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 min-h-[120px]"
                                        maxLength={2000}
                                        disabled={isSubmitting}
                                    />
                                    <div className="text-xs text-gray-400 text-right">
                                        {formData.description.length}/2000 characters
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-200">
                                        Attachments (Optional)
                                    </Label>
                                    <div
                                        className={cn(
                                            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                                            dragActive
                                                ? "border-purple-500 bg-purple-500/10"
                                                : "border-gray-600 hover:border-gray-500",
                                            isSubmitting && "opacity-50 cursor-not-allowed"
                                        )}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-300 mb-2">
                                            Drag and drop files here, or{' '}
                                            <label className="text-purple-400 hover:text-purple-300 cursor-pointer underline">
                                                browse
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept={ALLOWED_EXTENSIONS.join(',')}
                                                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                                                    className="hidden"
                                                    disabled={isSubmitting}
                                                />
                                            </label>
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            Max {MAX_FILES} files, 25MB each.
                                        </p>
                                    </div>

                                    {formData.files.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-200">
                                                Selected Files ({formData.files.length}/{MAX_FILES})
                                            </Label>
                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                                {formData.files.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-2 bg-gray-700 rounded-md"
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            {getFileIcon(file.name)}
                                                            <span className="text-sm text-gray-200 truncate max-w-[200px]">
                                                                {file.name}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                ({formatFileSize(file.size)})
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeFile(index)}
                                                            className="text-gray-400 hover:text-red-400 h-6 w-6 p-0"
                                                            disabled={isSubmitting}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClose}
                                        disabled={isSubmitting}
                                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Submit Request
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </DialogContent>
            </Dialog>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={() => { }}>
                <DialogContent className="max-w-md bg-gray-900 border-green-500">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-xl font-bold text-center bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                            <div className="flex items-center justify-center space-x-2">
                                <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span>Support Ticket Created!</span>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="text-center space-y-4 py-4">
                        <p className="text-gray-300 text-lg">
                            Your support request has been submitted successfully!
                        </p>

                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-1">Ticket ID:</p>
                            <p className="text-green-400 font-mono text-lg font-semibold break-all">
                                #{successTicketId}
                            </p>
                        </div>

                        <div className="space-y-2 text-gray-300">
                            <p className="font-medium">✅ Our team will contact you soon!</p>
                        </div>

                        <Button
                            onClick={handleSuccessClose}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
