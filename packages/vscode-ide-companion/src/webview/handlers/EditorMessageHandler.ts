/**
 * @license
 * Copyright 2025 Qwen Team
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../../utils/logger.js';
import * as vscode from 'vscode';
import { BaseMessageHandler } from './BaseMessageHandler.js';
import { getFileName } from '../utils/webviewUtils.js';
import { getErrorMessage } from '../../utils/errorMessage.js';
import { openExtensionLink } from '../../utils/extensionLink.js';

/**
 * Editor message handler
 * Handles all editor state-related messages
 */
export class EditorMessageHandler extends BaseMessageHandler {
  canHandle(messageType: string): boolean {
    return [
      'getActiveEditor',
      'focusActiveEditor',
      'openExtensionLink',
    ].includes(messageType);
  }

  async handle(message: { type: string; data?: unknown }): Promise<void> {
    switch (message.type) {
      case 'getActiveEditor':
        await this.handleGetActiveEditor();
        break;

      case 'focusActiveEditor':
        await this.handleFocusActiveEditor();
        break;

      case 'openExtensionLink': {
        const url = (message.data as { url?: unknown } | undefined)?.url;
        if (typeof url !== 'string') break;
        try {
          await openExtensionLink(url);
        } catch (error) {
          logger.error(
            '[EditorMessageHandler] Failed to open extension link:',
            error,
          );
        }
        break;
      }

      default:
        logger.warn(
          '[EditorMessageHandler] Unknown message type:',
          message.type,
        );
        break;
    }
  }

  /**
   * Get current active editor info
   */
  private async handleGetActiveEditor(): Promise<void> {
    try {
      const activeEditor = vscode.window.activeTextEditor;

      if (activeEditor) {
        const filePath = activeEditor.document.uri.fsPath;
        const fileName = getFileName(filePath);

        let selectionInfo = null;
        if (!activeEditor.selection.isEmpty) {
          const selection = activeEditor.selection;
          selectionInfo = {
            startLine: selection.start.line + 1,
            endLine: selection.end.line + 1,
          };
        }

        this.sendToWebView({
          type: 'activeEditorChanged',
          data: { fileName, filePath, selection: selectionInfo },
        });
      } else {
        this.sendToWebView({
          type: 'activeEditorChanged',
          data: { fileName: null, filePath: null, selection: null },
        });
      }
    } catch (error) {
      logger.error(
        '[EditorMessageHandler] Failed to get active editor:',
        error,
      );
    }
  }

  /**
   * Focus on active editor
   */
  private async handleFocusActiveEditor(): Promise<void> {
    try {
      const activeEditor = vscode.window.activeTextEditor;

      if (activeEditor) {
        await vscode.window.showTextDocument(activeEditor.document, {
          viewColumn: activeEditor.viewColumn,
          preserveFocus: false,
        });
      } else {
        // If no active editor, show file picker
        const uri = await vscode.window.showOpenDialog({
          defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
          canSelectMany: false,
          canSelectFiles: true,
          canSelectFolders: false,
          openLabel: 'Open',
        });

        if (uri && uri.length > 0) {
          await vscode.window.showTextDocument(uri[0]);
        }
      }
    } catch (error) {
      logger.error(
        '[EditorMessageHandler] Failed to focus active editor:',
        error,
      );
      vscode.window.showErrorMessage(
        `Failed to focus editor: ${getErrorMessage(error)}`,
      );
    }
  }
}
