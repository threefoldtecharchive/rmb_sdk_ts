// package: 
// file: types.proto

import * as jspb from "google-protobuf";

export class Request extends jspb.Message {
  getCommand(): string;
  setCommand(value: string): void;

  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Request.AsObject;
  static toObject(includeInstance: boolean, msg: Request): Request.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Request, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Request;
  static deserializeBinaryFromReader(message: Request, reader: jspb.BinaryReader): Request;
}

export namespace Request {
  export type AsObject = {
    command: string,
    data: Uint8Array | string,
  }
}

export class Error extends jspb.Message {
  getCode(): number;
  setCode(value: number): void;

  getMessage(): string;
  setMessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Error.AsObject;
  static toObject(includeInstance: boolean, msg: Error): Error.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Error, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Error;
  static deserializeBinaryFromReader(message: Error, reader: jspb.BinaryReader): Error;
}

export namespace Error {
  export type AsObject = {
    code: number,
    message: string,
  }
}

export class Reply extends jspb.Message {
  getData(): Uint8Array | string;
  getData_asU8(): Uint8Array;
  getData_asB64(): string;
  setData(value: Uint8Array | string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Reply.AsObject;
  static toObject(includeInstance: boolean, msg: Reply): Reply.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Reply, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Reply;
  static deserializeBinaryFromReader(message: Reply, reader: jspb.BinaryReader): Reply;
}

export namespace Reply {
  export type AsObject = {
    data: Uint8Array | string,
  }
}

export class Response extends jspb.Message {
  hasReply(): boolean;
  clearReply(): void;
  getReply(): Reply | undefined;
  setReply(value?: Reply): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  getBodyCase(): Response.BodyCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Response.AsObject;
  static toObject(includeInstance: boolean, msg: Response): Response.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Response, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Response;
  static deserializeBinaryFromReader(message: Response, reader: jspb.BinaryReader): Response;
}

export namespace Response {
  export type AsObject = {
    reply?: Reply.AsObject,
    error?: Error.AsObject,
  }

  export enum BodyCase {
    BODY_NOT_SET = 0,
    REPLY = 1,
    ERROR = 2,
  }
}

export class Address extends jspb.Message {
  getTwin(): number;
  setTwin(value: number): void;

  hasConnection(): boolean;
  clearConnection(): void;
  getConnection(): string;
  setConnection(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Address.AsObject;
  static toObject(includeInstance: boolean, msg: Address): Address.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Address, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Address;
  static deserializeBinaryFromReader(message: Address, reader: jspb.BinaryReader): Address;
}

export namespace Address {
  export type AsObject = {
    twin: number,
    connection: string,
  }
}

export class Envelope extends jspb.Message {
  getUid(): string;
  setUid(value: string): void;

  hasTags(): boolean;
  clearTags(): void;
  getTags(): string;
  setTags(value: string): void;

  getTimestamp(): number;
  setTimestamp(value: number): void;

  getExpiration(): number;
  setExpiration(value: number): void;

  hasSource(): boolean;
  clearSource(): void;
  getSource(): Address | undefined;
  setSource(value?: Address): void;

  hasDestination(): boolean;
  clearDestination(): void;
  getDestination(): Address | undefined;
  setDestination(value?: Address): void;

  hasRequest(): boolean;
  clearRequest(): void;
  getRequest(): Request | undefined;
  setRequest(value?: Request): void;

  hasResponse(): boolean;
  clearResponse(): void;
  getResponse(): Response | undefined;
  setResponse(value?: Response): void;

  hasSignature(): boolean;
  clearSignature(): void;
  getSignature(): Uint8Array | string;
  getSignature_asU8(): Uint8Array;
  getSignature_asB64(): string;
  setSignature(value: Uint8Array | string): void;

  hasSchema(): boolean;
  clearSchema(): void;
  getSchema(): string;
  setSchema(value: string): void;

  hasFederation(): boolean;
  clearFederation(): void;
  getFederation(): string;
  setFederation(value: string): void;

  getMessageCase(): Envelope.MessageCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Envelope.AsObject;
  static toObject(includeInstance: boolean, msg: Envelope): Envelope.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Envelope, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Envelope;
  static deserializeBinaryFromReader(message: Envelope, reader: jspb.BinaryReader): Envelope;
}

export namespace Envelope {
  export type AsObject = {
    uid: string,
    tags: string,
    timestamp: number,
    expiration: number,
    source?: Address.AsObject,
    destination?: Address.AsObject,
    request?: Request.AsObject,
    response?: Response.AsObject,
    signature: Uint8Array | string,
    schema: string,
    federation: string,
  }

  export enum MessageCase {
    MESSAGE_NOT_SET = 0,
    REQUEST = 7,
    RESPONSE = 8,
  }
}

