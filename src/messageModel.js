import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'message' },
    attributes: { 
        content: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    relationships: {
        sender: { 
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'user' }
            }
        }
    }
}, { id: false });

// Export message model
export const Message = mongoose.model('message', messageSchema);