import { parseStringPromise } from 'xml2js';
import {
  IScormManifest,
  IScormOrganization,
  IScormResource,
  IScormMetadata,
  IScormItem,
  ScormVersion,
} from '../../types/scorm';

/**
 * SCORM Manifest Parser
 * Parses imsmanifest.xml files and extracts SCORM package metadata
 */
export class ManifestParser {
  /**
   * Parse imsmanifest.xml content
   */
  async parse(manifestXml: string): Promise<IScormManifest> {
    try {
      const parsed = await parseStringPromise(manifestXml, {
        trim: true,
        explicitArray: true,
        mergeAttrs: false,
      });

      if (!parsed.manifest) {
        throw new Error('Invalid manifest: missing root <manifest> element');
      }

      const manifest = parsed.manifest;

      // Extract basic information
      const identifier = this.getAttributeValue(manifest, 'identifier');
      const version = this.detectVersion(manifest, manifestXml);

      // Extract metadata
      const metadata = this.parseMetadata(manifest.metadata);

      // Extract organizations
      const organizations = this.parseOrganizations(manifest.organizations);

      // Extract resources
      const resources = this.parseResources(manifest.resources);

      return {
        identifier,
        version,
        organizations,
        resources,
        metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to parse manifest: ${error.message}`);
    }
  }

  /**
   * Get the launch URL from manifest data
   */
  getLaunchUrl(manifestData: IScormManifest): string {
    try {
      // Find the default organization
      const defaultOrg = manifestData.organizations.find((org) => org.items.length > 0);

      if (!defaultOrg || defaultOrg.items.length === 0) {
        // Fallback to first resource
        if (manifestData.resources.length > 0) {
          return manifestData.resources[0].href || 'index.html';
        }
        return 'index.html';
      }

      // Get the first item
      const firstItem = defaultOrg.items[0];

      // Find the resource for this item
      if (firstItem.identifierref) {
        const resource = manifestData.resources.find(
          (r) => r.identifier === firstItem.identifierref
        );

        if (resource && resource.href) {
          return resource.href;
        }
      }

      // Fallback to index.html
      return 'index.html';
    } catch (error) {
      return 'index.html';
    }
  }

  /**
   * Detect SCORM version from manifest
   */
  private detectVersion(manifest: any, xml: string): ScormVersion {
    // Check schema version in metadata
    if (manifest.metadata && manifest.metadata[0]) {
      const metadata = manifest.metadata[0];

      if (metadata.schemaversion || metadata.schemaVersion) {
        const version = this.getElementText(metadata.schemaversion || metadata.schemaVersion);

        if (version.includes('1.2')) {
          return 'scorm_1.2';
        }
        if (version.includes('2004') || version.includes('1.3')) {
          return 'scorm_2004';
        }
      }
    }

    // Check namespace
    const namespaces = this.getAttributeValue(manifest, 'xmlns') || '';

    if (namespaces.includes('IMS_1.2') || xml.includes('IMS_1.2')) {
      return 'scorm_1.2';
    }

    if (
      namespaces.includes('IMS_2004') ||
      namespaces.includes('SCORM_2004') ||
      xml.includes('IMS_2004') ||
      xml.includes('SCORM_2004')
    ) {
      return 'scorm_2004';
    }

    // Check for SCORM type in resources
    if (xml.includes('adlcp:scormType') || xml.includes('adlcp:scormtype')) {
      if (xml.includes('2004')) {
        return 'scorm_2004';
      }
      return 'scorm_1.2';
    }

    // Default to SCORM 1.2
    return 'scorm_1.2';
  }

  /**
   * Parse metadata section
   */
  private parseMetadata(metadataArray: any[] | undefined): IScormMetadata | undefined {
    if (!metadataArray || metadataArray.length === 0) {
      return undefined;
    }

    const metadata = metadataArray[0];
    const result: IScormMetadata = {};

    // Schema version
    if (metadata.schemaversion || metadata.schemaVersion) {
      result.schemaVersion = this.getElementText(metadata.schemaversion || metadata.schemaVersion);
    }

    // LOM (Learning Object Metadata) - if present
    if (metadata.lom || metadata.LOM) {
      const lom = metadata.lom?.[0] || metadata.LOM?.[0];

      // General section
      if (lom.general) {
        const general = lom.general[0];

        // Title
        if (general.title) {
          const titleLangstring = general.title[0]?.langstring || general.title[0]?.langString;
          if (titleLangstring) {
            result.title = this.getElementText(titleLangstring);
          }
        }

        // Description
        if (general.description) {
          const descLangstring =
            general.description[0]?.langstring || general.description[0]?.langString;
          if (descLangstring) {
            result.description = this.getElementText(descLangstring);
          }
        }

        // Keywords
        if (general.keyword) {
          result.keywords = general.keyword
            .map((kw: any) => this.getElementText(kw.langstring || kw.langString))
            .filter((k: string) => k);
        }

        // Language
        if (general.language) {
          result.language = this.getElementText(general.language);
        }
      }

      // Rights section
      if (lom.rights) {
        const rights = lom.rights[0];

        if (rights.copyrightandotherrestrictions?.value) {
          result.copyright = this.getElementText(rights.copyrightandotherrestrictions.value);
        }
      }

      // Educational section
      if (lom.educational) {
        const educational = lom.educational[0];

        if (educational.typicallearningtime?.duration) {
          result.duration = this.getElementText(educational.typicallearningtime.duration);
        }
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Parse organizations section
   */
  private parseOrganizations(organizationsArray: any[] | undefined): IScormOrganization[] {
    if (!organizationsArray || organizationsArray.length === 0) {
      return [];
    }

    const organizationsElement = organizationsArray[0];
    const organizations: IScormOrganization[] = [];

    if (organizationsElement.organization) {
      for (const org of organizationsElement.organization) {
        const identifier = this.getAttributeValue(org, 'identifier');
        const title = this.getElementText(org.title);
        const structure = this.getAttributeValue(org, 'structure') || 'hierarchical';

        const items = this.parseItems(org.item);

        organizations.push({
          identifier,
          title,
          structure,
          items,
        });
      }
    }

    return organizations;
  }

  /**
   * Parse organization items recursively
   */
  private parseItems(itemsArray: any[] | undefined): IScormItem[] {
    if (!itemsArray) {
      return [];
    }

    const items: IScormItem[] = [];

    for (const item of itemsArray) {
      const identifier = this.getAttributeValue(item, 'identifier');
      const identifierref = this.getAttributeValue(item, 'identifierref');
      const title = this.getElementText(item.title);
      const type = this.getAttributeValue(item, 'type');
      const isVisible = this.getAttributeValue(item, 'isvisible') !== 'false';
      const parameters = this.getAttributeValue(item, 'parameters');

      // Parse child items recursively
      const children = this.parseItems(item.item);

      items.push({
        identifier,
        title,
        identifierref,
        type,
        isVisible,
        parameters,
        children: children.length > 0 ? children : undefined,
      });
    }

    return items;
  }

  /**
   * Parse resources section
   */
  private parseResources(resourcesArray: any[] | undefined): IScormResource[] {
    if (!resourcesArray || resourcesArray.length === 0) {
      return [];
    }

    const resourcesElement = resourcesArray[0];
    const resources: IScormResource[] = [];

    if (resourcesElement.resource) {
      for (const resource of resourcesElement.resource) {
        const identifier = this.getAttributeValue(resource, 'identifier');
        const type = this.getAttributeValue(resource, 'type') || 'webcontent';
        const href = this.getAttributeValue(resource, 'href') || '';
        const scormType =
          this.getAttributeValue(resource, 'adlcp:scormType') ||
          this.getAttributeValue(resource, 'adlcp:scormtype');

        // Parse dependencies
        const dependencies: string[] = [];
        if (resource.dependency) {
          for (const dep of resource.dependency) {
            const depIdentifier = this.getAttributeValue(dep, 'identifierref');
            if (depIdentifier) {
              dependencies.push(depIdentifier);
            }
          }
        }

        // Parse files
        const files: string[] = [];
        if (resource.file) {
          for (const file of resource.file) {
            const fileHref = this.getAttributeValue(file, 'href');
            if (fileHref) {
              files.push(fileHref);
            }
          }
        }

        resources.push({
          identifier,
          type,
          href,
          scormType,
          dependencies: dependencies.length > 0 ? dependencies : undefined,
          files: files.length > 0 ? files : undefined,
        });
      }
    }

    return resources;
  }

  /**
   * Get attribute value from element
   */
  private getAttributeValue(element: any, attributeName: string): string {
    if (!element || !element.$) {
      return '';
    }

    return element.$[attributeName] || '';
  }

  /**
   * Get text content from element
   */
  private getElementText(element: any): string {
    if (!element) {
      return '';
    }

    if (typeof element === 'string') {
      return element;
    }

    if (Array.isArray(element) && element.length > 0) {
      return this.getElementText(element[0]);
    }

    if (element._) {
      return element._;
    }

    return '';
  }
}
