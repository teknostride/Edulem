import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Boyut seçeneği ekledik
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* KARARTMA PERDESİ (Backdrop) */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }} 
        onClick={onClose} // Perdeye basınca kapansın
      ></div>

      {/* MODAL PENCERESİ */}
      <div 
        className="modal fade show d-block" 
        tabIndex={-1} 
        style={{ zIndex: 1050 }}
        role="dialog"
      >
        <div className={`modal-dialog modal-dialog-centered modal-${size}`} role="document">
          <div className="modal-content border-0 shadow-lg">
            
            {/* BAŞLIK */}
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title fw-bold text-primary">{title}</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>

            {/* İÇERİK */}
            <div className="modal-body p-4">
              {children}
            </div>

            {/* ALT BİLGİ (Varsa) */}
            {footer && (
              <div className="modal-footer border-top-0 pt-0">
                {footer}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;