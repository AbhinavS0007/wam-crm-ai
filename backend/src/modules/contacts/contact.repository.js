import { createUniqueLeadId } from '../../services/lead-id.service.js';
import {
  decryptContactEmailFromStorage,
  decryptContactPhoneFromStorage,
  decryptContactProviderJidsFromStorage,
  encryptContactEmailForStorage,
  encryptContactPhoneForStorage,
  encryptContactProviderJidsForStorage,
} from '../privacy/protected-pii.service.js';
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

export const setContactEncryptedPii = ({
  contactId,
  organizationId,
  phone,
  email,
  providerJids,
} = {}) => {
  const update = {};

  if (phone !== undefined) {
    update.encryptedPhone = encryptContactPhoneForStorage(phone);
  }

  if (email !== undefined) {
    update.encryptedEmail = encryptContactEmailForStorage(email);
  }

  if (providerJids !== undefined) {
    update.encryptedProviderJids = encryptContactProviderJidsForStorage(providerJids);
  }

  return Contact.findOneAndUpdate(
    {
      _id: contactId,
      organizationId,
    },
    update,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  )
    .select('+encryptedPhone +encryptedEmail +encryptedProviderJids')
    .exec();
};

export const findContactPrivatePiiForInternalUse = async ({ contactId, organizationId } = {}) => {
  const contact = await findContactById({
    contactId,
    organizationId,
    includeEncrypted: true,
  });

  if (!contact) {
    return null;
  }

  return {
    contactId: contact._id,
    organizationId: contact.organizationId,
    phone: decryptContactPhoneFromStorage(contact.encryptedPhone),
    email: decryptContactEmailFromStorage(contact.encryptedEmail),
    providerJids: decryptContactProviderJidsFromStorage(contact.encryptedProviderJids),
  };
};
