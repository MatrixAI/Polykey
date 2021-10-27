// package: notification
// file: Notifications.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Notification extends jspb.Message { 

    hasGeneral(): boolean;
    clearGeneral(): void;
    getGeneral(): General | undefined;
    setGeneral(value?: General): Notification;

    hasGestaltInvite(): boolean;
    clearGestaltInvite(): void;
    getGestaltInvite(): string;
    setGestaltInvite(value: string): Notification;

    hasVaultShare(): boolean;
    clearVaultShare(): void;
    getVaultShare(): Share | undefined;
    setVaultShare(value?: Share): Notification;
    getSenderId(): string;
    setSenderId(value: string): Notification;
    getIsRead(): boolean;
    setIsRead(value: boolean): Notification;

    getDataCase(): Notification.DataCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Notification.AsObject;
    static toObject(includeInstance: boolean, msg: Notification): Notification.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Notification, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Notification;
    static deserializeBinaryFromReader(message: Notification, reader: jspb.BinaryReader): Notification;
}

export namespace Notification {
    export type AsObject = {
        general?: General.AsObject,
        gestaltInvite: string,
        vaultShare?: Share.AsObject,
        senderId: string,
        isRead: boolean,
    }

    export enum DataCase {
        DATA_NOT_SET = 0,
        GENERAL = 1,
        GESTALT_INVITE = 2,
        VAULT_SHARE = 3,
    }

}

export class Send extends jspb.Message { 
    getReceiverId(): string;
    setReceiverId(value: string): Send;

    hasData(): boolean;
    clearData(): void;
    getData(): General | undefined;
    setData(value?: General): Send;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Send.AsObject;
    static toObject(includeInstance: boolean, msg: Send): Send.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Send, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Send;
    static deserializeBinaryFromReader(message: Send, reader: jspb.BinaryReader): Send;
}

export namespace Send {
    export type AsObject = {
        receiverId: string,
        data?: General.AsObject,
    }
}

export class Read extends jspb.Message { 
    getUnread(): boolean;
    setUnread(value: boolean): Read;
    getNumber(): string;
    setNumber(value: string): Read;
    getOrder(): string;
    setOrder(value: string): Read;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Read.AsObject;
    static toObject(includeInstance: boolean, msg: Read): Read.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Read, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Read;
    static deserializeBinaryFromReader(message: Read, reader: jspb.BinaryReader): Read;
}

export namespace Read {
    export type AsObject = {
        unread: boolean,
        number: string,
        order: string,
    }
}

export class List extends jspb.Message { 
    clearNotificationList(): void;
    getNotificationList(): Array<Notification>;
    setNotificationList(value: Array<Notification>): List;
    addNotification(value?: Notification, index?: number): Notification;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): List.AsObject;
    static toObject(includeInstance: boolean, msg: List): List.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: List, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): List;
    static deserializeBinaryFromReader(message: List, reader: jspb.BinaryReader): List;
}

export namespace List {
    export type AsObject = {
        notificationList: Array<Notification.AsObject>,
    }
}

export class General extends jspb.Message { 
    getMessage(): string;
    setMessage(value: string): General;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): General.AsObject;
    static toObject(includeInstance: boolean, msg: General): General.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: General, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): General;
    static deserializeBinaryFromReader(message: General, reader: jspb.BinaryReader): General;
}

export namespace General {
    export type AsObject = {
        message: string,
    }
}

export class Share extends jspb.Message { 
    getVaultId(): string;
    setVaultId(value: string): Share;
    getVaultName(): string;
    setVaultName(value: string): Share;
    clearActionsList(): void;
    getActionsList(): Array<string>;
    setActionsList(value: Array<string>): Share;
    addActions(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Share.AsObject;
    static toObject(includeInstance: boolean, msg: Share): Share.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Share, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Share;
    static deserializeBinaryFromReader(message: Share, reader: jspb.BinaryReader): Share;
}

export namespace Share {
    export type AsObject = {
        vaultId: string,
        vaultName: string,
        actionsList: Array<string>,
    }
}
