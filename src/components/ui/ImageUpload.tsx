import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { Upload } from 'lucide-react';

interface ImageUploadProps {
  url: string | null;
  onUpload: (url: string) => void;
  bucket?: string;
  label?: string;
  className?: string;
  aspectRatio?: 'square' | 'video';
}

export function ImageUpload({ 
  url, 
  onUpload, 
  bucket = 'media', 
  label = 'Changer l\'image',
  className = '',
  aspectRatio = 'square'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onUpload(data.publicUrl);
    } catch (error) {
      alert('Error uploading avatar!');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {url ? (
        <div className={`relative overflow-hidden rounded-xl border border-gray-200 ${aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'} bg-gray-50`}>
           <img src={url} alt="Upload" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button 
                type="button" 
                variant="secondary" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Modifier
              </Button>
           </div>
        </div>
      ) : (
        <div 
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex flex-col items-center justify-center ${aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'}`}
        >
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500 font-medium">{label}</span>
        </div>
      )}

      <input
        type="file"
        className="hidden"
        accept="image/*"
        onChange={uploadImage}
        disabled={uploading}
        ref={fileInputRef}
      />
    </div>
  );
}

