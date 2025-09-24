import { SlashCommand, BlockType } from '../types/BlockTypes';

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'text',
    label: 'Texte',
    description: 'Bloc de texte simple',
    type: 'text',
    icon: '📝',
    keywords: ['text', 'texte', 'paragraph', 'paragraphe'],
    shortcut: '/text',
  },
  {
    id: 'h1',
    label: 'Titre 1',
    description: 'Titre principal (H1)',
    type: 'h1',
    icon: '📋',
    keywords: ['heading', 'titre', 'h1', 'header'],
    shortcut: '/h1',
  },
  {
    id: 'h2',
    label: 'Titre 2',
    description: 'Sous-titre (H2)',
    type: 'h2',
    icon: '📄',
    keywords: ['heading', 'titre', 'h2', 'subtitle'],
    shortcut: '/h2',
  },
  {
    id: 'h3',
    label: 'Titre 3',
    description: 'Sous-sous-titre (H3)',
    type: 'h3',
    icon: '📃',
    keywords: ['heading', 'titre', 'h3', 'subheading'],
    shortcut: '/h3',
  },
  {
    id: 'list',
    label: 'Liste',
    description: 'Liste à puces ou numérotée',
    type: 'list',
    icon: '📋',
    keywords: ['list', 'liste', 'bullet', 'puce', 'numbered'],
    shortcut: '/list',
  },
  {
    id: 'quote',
    label: 'Citation',
    description: 'Bloc de citation',
    type: 'quote',
    icon: '💬',
    keywords: ['quote', 'citation', 'blockquote'],
    shortcut: '/quote',
  },
  {
    id: 'code',
    label: 'Code',
    description: 'Bloc de code avec coloration syntaxique',
    type: 'code',
    icon: '💻',
    keywords: ['code', 'programming', 'snippet'],
    shortcut: '/code',
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Insérer une image',
    type: 'image',
    icon: '🖼️',
    keywords: ['image', 'picture', 'photo', 'img'],
    shortcut: '/image',
  },
  {
    id: 'table',
    label: 'Tableau',
    description: 'Tableau avec lignes et colonnes',
    type: 'table',
    icon: '📊',
    keywords: ['table', 'tableau', 'grid'],
    shortcut: '/table',
  },
  {
    id: 'todo',
    label: 'Todo',
    description: 'Case à cocher pour les tâches',
    type: 'todo',
    icon: '☑️',
    keywords: ['todo', 'task', 'checkbox', 'tache'],
    shortcut: '/todo',
  },
  {
    id: 'separator',
    label: 'Séparateur',
    description: 'Ligne horizontale pour séparer le contenu',
    type: 'separator',
    icon: '➖',
    keywords: ['separator', 'separateur', 'divider', 'ligne', 'hr'],
    shortcut: '/separator',
  },
];

export class SlashCommandMatcher {
  static searchCommands(query: string): SlashCommand[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery || !lowerQuery.startsWith('/')) {
      return [];
    }

    const searchTerm = lowerQuery.slice(1); // Remove the '/'

    // Show all commands when just '/' is typed
    if (!searchTerm) {
      return SLASH_COMMANDS;
    }

    return SLASH_COMMANDS.filter(command => {
      // Exact shortcut match (without /)
      if (command.shortcut.slice(1) === searchTerm) {
        return true;
      }

      // Label match
      if (command.label.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Keywords match
      return command.keywords.some(keyword =>
        keyword.toLowerCase().includes(searchTerm)
      );
    });
  }

  static getExactCommand(shortcut: string): SlashCommand | null {
    return SLASH_COMMANDS.find(cmd => cmd.shortcut === shortcut) || null;
  }

  static isSlashCommand(text: string): boolean {
    return text.startsWith('/');
  }

  static extractSlashCommand(text: string): string | null {
    const match = text.match(/^(\/\w+)/);
    return match ? match[1] : null;
  }
}