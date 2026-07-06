import { createUniqueLeadId } from '../../services/lead-id.service.js';
import { Contact } from './contact.model.js';

const withEncryptedFields = (query, includeEncrypted) => {
  if (!includeEncrypted) {
    return query;
  }

  return query.select('+encryptedPhone +encryptedEmail +encryptedProviderJids');
};

export const createContact = async (contactData) => {
  const leadId =
    contactData.leadId ??
    (await createUniqueLeadId({
      exists: (candidateLeadId) =>
        Contact.exists({
          organizationId: contactData.organizationId,
          leadId: candidateLeadId,
        }),
    }));

  return Contact.create({
    ...contactData,
    leadId,
  });
};

export const findContactById = ({ contactId, organizationId, includeEncrypted = false } = {}) => {
  const filter = {
    _id: contactId,
  };

  if (organizationId) {
    filter.organizationId = organizationId;
  }

  return withEncryptedFields(Contact.findOne(filter), includeEncrypted).exec();
};

export const findContactByLeadId = ({ organizationId, leadId, includeEncrypted = false } = {}) =>
  withEncryptedFields(
    Contact.findOne({
      organizationId,
      leadId,
    }),
    includeEncrypted,
  ).exec();

export const findOrCreateContactByLeadId = async ({
  organizationId,
  leadId,
  contactData = {},
} = {}) => {
  const existingContact = await findContactByLeadId({
    organizationId,
    leadId,
  });

  if (existingContact) {
    return {
      contact: existingContact,
      created: false,
    };
  }

  try {
    const contact = await createContact({
      ...contactData,
      organizationId,
      leadId,
    });

    return {
      contact,
      created: true,
    };
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const contact = await findContactByLeadId({
      organizationId,
      leadId,
    });

    return {
      contact,
      created: false,
    };
  }
};
