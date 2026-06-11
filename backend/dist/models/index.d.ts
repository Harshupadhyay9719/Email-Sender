/**
 * MongoDB Models - Mongoose Schemas
 */
import mongoose from 'mongoose';
import { UserInterface, OrganizationInterface, CampaignInterface, EmailLogInterface, ImportLogInterface, ConnectedAccountInterface } from '../types/index';
export declare const User: mongoose.Model<UserInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}, {}, mongoose.Document<unknown, {}, UserInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}> & UserInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
    _id: string & mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Organization: mongoose.Model<OrganizationInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}, {}, mongoose.Document<unknown, {}, OrganizationInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}> & OrganizationInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
    _id: string & mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Campaign: mongoose.Model<CampaignInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}, {}, mongoose.Document<unknown, {}, CampaignInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}> & CampaignInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
    _id: string & mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const EmailLog: mongoose.Model<EmailLogInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}, {}, mongoose.Document<unknown, {}, EmailLogInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}> & EmailLogInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
    _id: string & mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const ImportLog: mongoose.Model<ImportLogInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}, {}, mongoose.Document<unknown, {}, ImportLogInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}> & ImportLogInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
    _id: string & mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const ConnectedAccount: mongoose.Model<ConnectedAccountInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}, {}, mongoose.Document<unknown, {}, ConnectedAccountInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}>, {}, {}> & ConnectedAccountInterface & mongoose.Document<mongoose.Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
    _id: string & mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=index.d.ts.map