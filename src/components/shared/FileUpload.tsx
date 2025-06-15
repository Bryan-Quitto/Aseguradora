import React, { ChangeEvent } from 'react';

interface FileUploadProps {
    id: string;
    name: string;
    label: string;
    accept?: string;
    multiple?: boolean;
    onChange: (files: FileList | null) => void;
    required?: boolean;
    className?: string;
    disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
    id,
    name,
    label,
    accept = "*/*",
    multiple = false,
    onChange,
    required = false,
    className = "",
    disabled = false // Asegurarse de que `disabled` se use
}) => {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.files);
    };

    return (
        <div className={`mb-4 ${className}`}>
            <label
                htmlFor={id}
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
                {label}
            </label>
            <input
                type="file"
                id={id}
                name={name}
                onChange={handleFileChange}
                accept={accept}
                multiple={multiple}
                required={required}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                disabled={disabled} // Aplicar la propiedad disabled
            />
        </div>
    );
};

export default FileUpload;